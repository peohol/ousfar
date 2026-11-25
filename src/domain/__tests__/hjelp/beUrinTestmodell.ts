import {
  godkjennBeUrinModell,
  godkjennBeUrinProfilmodell,
  type BeUrinKurve,
  type BeUrinModell,
  type BeUrinProfil,
  type BeUrinProfilmodell,
  type GodkjentBeUrinModell,
  type GodkjentBeUrinProfilmodell,
} from '../../beUrinModell'

/**
 * Modellene testene av benzoylekgonin i urin bruker. Bare for testene.
 *
 * Kurvene er bestillingens (#562), med alle oppgitte sifre: de er klinikerens
 * premiss og står her så testene prøver de virkelige profilene. Alt annet er
 * SYNTETISK og ikke bekreftet: enhetene, kvotientfaktoren og CV-ene. De skal
 * aldri brukes som klinisk konfigurasjon (docs/benzoylekgonin-urin.md).
 * Marginene og z er de samme som THC-syremodulens publiserte.
 */

/** C1(t) og C2(t) slik bestillingen oppgir dem. */
export const BESTILTE_KURVER: [BeUrinKurve, BeUrinKurve] = [
  { navn: 'Utskillelsesprofil 1', a1: 107.189780, k1: 0.07822197, a2: 3.879389, k2: 0.00796211 },
  { navn: 'Utskillelsesprofil 2', a1: 115.772143, k1: 0.408875962, a2: 4.569599, k2: 0.015911821 },
]

/** Sikkerhetsmarginene: ingen, 90 % og 99 %, med z fra THC-syreregelsettet. */
export const MARGINER = [
  { margin: 0.5, z: 0 },
  { margin: 0.9, z: -1.2815515655446008 },
  { margin: 0.99, z: -2.3263478740408408 },
]

/** En syntetisk modell med de bestilte kurvene og oppdiktede CV-er. */
export const SYNTETISK_MODELL: BeUrinModell = {
  versjon: 'syntetisk-test-1',
  enheter: { benzoylekgonin: 'enhet B', kreatinin: 'enhet K', kvotient: 'enhet Q' },
  kvotientfaktor: 1,
  kurver: BESTILTE_KURVER,
  maleusikkerhet: { cv_benzoylekgonin: 0.1, cv_kreatinin: 0.05 },
  sikkerhetsmarginer: MARGINER,
  standard_sikkerhetsmargin: 0.9,
}

/** Modellen godkjent, eller en feil i testen. */
export function godkjent(m: BeUrinModell = SYNTETISK_MODELL): GodkjentBeUrinModell {
  const r = godkjennBeUrinModell(m)
  if (!r.ok) throw new Error(r.feil.join(' '))
  return r.modell
}

/**
 * To profiler med like rater i begge ledd: C(t) = (a1 + a2)·e^(−k·t). Da er
 * terskelen e^(−k·d) uansett Q, en uavhengig fasit.
 */
export function enkelModell(k1: number, k2: number, overstyr: Partial<BeUrinModell> = {}): GodkjentBeUrinModell {
  return godkjent({
    ...SYNTETISK_MODELL,
    kurver: [
      { navn: 'Profil A', a1: 50, k1, a2: 50, k2: k1 },
      { navn: 'Profil B', a1: 50, k1: k2, a2: 50, k2 },
    ],
    ...overstyr,
  })
}

/* --- Form 2: fem profiler (#570) ------------------------------------------ */

/**
 * De fem profilene slik #570 oppgir dem, med alle sifre: k for de to
 * litteraturprofilene er 24·ln 2 / t½ (7 h og 35 h), moderat er den lokale
 * regresjonen (bare de avledede parametrene; rådataene står ikke i repoet), og
 * de to bieksponentielle er uendret fra #562.
 */
export const BESTILTE_PROFILER: BeUrinProfil[] = [
  { id: 'enkeltinntak', type: 'mono', a: 1, k: 2.3765046190626693 },
  { id: 'gjentatte_doser', type: 'mono', a: 1, k: 0.47530092381253386 },
  { id: 'moderat', type: 'mono', a: 267.2691490332445, k: 0.2891162303589332 },
  ...(['bi_a', 'bi_b'] as const).map((id, i): BeUrinProfil => {
    const { a1, k1, a2, k2 } = BESTILTE_KURVER[i]!
    return { id, type: 'bi', a1, k1, a2, k2 }
  }),
]

/**
 * En modell av form 2 med profilene, enhetene og måleusikkerheten fra #570
 * (CV 0,2 og 0,05, som THC-syreregelsettet). Bare for testene; den kliniske
 * modellen legges inn av aktiveringen.
 */
export const PROFILMODELL: BeUrinProfilmodell = {
  form: 2,
  versjon: 'syntetisk-test-2',
  enheter: { benzoylekgonin: 'nmol/L', kreatinin: 'mmol/L', kvotient: 'nmol/mmol' },
  kvotientfaktor: 1,
  profiler: BESTILTE_PROFILER,
  maleusikkerhet: { cv_benzoylekgonin: 0.2, cv_kreatinin: 0.05 },
  sikkerhetsmarginer: MARGINER,
  standard_sikkerhetsmargin: 0.9,
}

/** Modellen av form 2 godkjent, med det som er overstyrt, eller en feil i testen. */
export function godkjentProfilmodell(overstyr: Partial<BeUrinProfilmodell> = {}): GodkjentBeUrinProfilmodell {
  const r = godkjennBeUrinProfilmodell({ ...PROFILMODELL, ...overstyr })
  if (!r.ok) throw new Error(r.feil.join(' '))
  return r.modell
}

/** Profilene med én byttet ut. */
export function medProfil(profil: BeUrinProfil, profiler: BeUrinProfil[] = BESTILTE_PROFILER): BeUrinProfil[] {
  return profiler.map((p) => (p.id === profil.id ? profil : p))
}
