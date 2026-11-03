/**
 * VDK-1 i `docs/verktøy-omlegging-2026-11.md`: en praktisk dekningsoversikt
 * for de tre verktøyene, laget av de faktiske reglene og de syntetiske
 * kasusene, ikke av antakelser om bruk. Rapporten er
 * `docs/verktøy-vdk1-regeldekning.md`; `npm run verktoy:regler -- regeldekning`
 * skriver den, og testene sier fra når den ikke er oppdatert.
 *
 * Hver kombinasjon forskriveren kan velge i et verktøy går gjennom den samme
 * {@link tilgjengelighet} som verktøysiden, så oversikten kan ikke vise mer
 * eller mindre enn appen gjør. Kildetabellen brukes bare som metadata som
 * allerede ligger i repoet (om en celle har en lenke), og bare i sum; ingen
 * tekst fra Psychiatrienet vises (`docs/verktøy-p3-rettigheter.md`).
 *
 * Modellberegningen til slutt (følsomheten for trinngrensen) regner
 * nedtrappingsreglene på en kopi med en annen øvre grense for det foretrukne
 * området. Den er et beslutningsgrunnlag til faglig kontroll, aldri en regel,
 * en godkjenning eller noe appen bruker. Modulen brukes bare av skriptet og
 * testene.
 */
import { DEKNINGSSTATUS, dekningFor } from './dekning'
import { lesKartdata } from './kartdata'
import type { Kartdata } from './kartlegging'
import { FORMULERINGSNAVN, VERKTOY, virkestoffvalg, type Verktoy } from './register'
import { AKSEPTSTOFFER, beregnAksept, besvart, formerFor, LANG, PROSENTSTI, reduksjoner, vanligDose, type Festuttrekk, type Formalternativ } from './regler/aksepttest'
import { PLANHORISONT_TRINN } from './regler/bygg'
import { erKliniskGodkjent, harBeregning, kontrollutfall } from './regler/godkjenning'
import type { Beregningsinndata, Regel } from './regler/modell'
import { LANG_PROSENT } from './regler/nedtrapping'
import { KATEGORIER, PILOTKASUS, type Pilotkasus } from './regler/pilotmatrise'
import { liste, tabell, tall } from './regler/rapport'
import type { Doseplanresultat, Trinnvalg } from './motor/plan'
import { REGELSETT, reglerFor, tilgjengelighet, type Valgtvirkestoff, type Verktoyvalg } from './tilgjengelighet'

export const REGELDEKNINGSFIL = 'docs/verktøy-vdk1-regeldekning.md'

/* --- Kombinasjonene og utfallet ---------------------------------------------- */

/**
 * Hva verktøyet gir for én kombinasjon, med grunnen når det ikke gir en plan.
 * Rekkefølgen er fra mest til minst: en beregning, godkjent fagtekst, en regel
 * som finnes men ikke er godkjent, og ingen regel, med grunnen til det.
 */
export type Dekningsutfall =
  | 'beregning'
  | 'fagtekst'
  | 'ikke_godkjent'
  | 'fagtekst_ikke_godkjent'
  | 'til_kontroll'
  | 'medlem_ikke_vurdert'
  | 'kilde_har_anbefaling'
  | 'kilde_uten_anbefaling'
  | 'begrenset'
  | 'mellomlang'

export const DEKNINGSUTFALL: Record<Dekningsutfall, string> = {
  beregning: 'Beregning med klinisk godkjent regel (i godkjent omfang)',
  fagtekst: 'Klinisk godkjent fagtekst, ingen beregning',
  ikke_godkjent: 'Regel finnes, kontrollert og ikke godkjent',
  fagtekst_ikke_godkjent: 'Regel finnes som fagtekst, ikke godkjent',
  til_kontroll: 'Regel finnes, ikke ferdig kontrollert',
  medlem_ikke_vurdert: 'Godkjent regel, men ikke vurdert for dette virkestoffet',
  kilde_har_anbefaling: 'Ingen OUSFAR-regel; kilden har en anbefaling',
  kilde_uten_anbefaling: 'Ingen OUSFAR-regel; kilden har ingen anbefaling',
  begrenset: 'Ingen OUSFAR-regel; begrenset av preparater eller kilde',
  mellomlang: 'Ikke støttet: middels langtidsvirkende injeksjon',
}

const UTFALLSREKKEFOLGE = Object.keys(DEKNINGSUTFALL) as Dekningsutfall[]

export interface Kombinasjon {
  valg: Verktoyvalg
  utfall: Dekningsutfall
  /** Reglene utfallet gjelder. */
  regler: Regel[]
}

/** Alle valg forskriveren kan gjøre i verktøyet: hvert virkestoff i hver formulering, og for bytte hvert ordnede par av ulike valg. */
export function kombinasjoner(v: Verktoy): Verktoyvalg[] {
  const alle: Valgtvirkestoff[] = virkestoffvalg(v).flatMap((s) => s.formuleringer.map((formulering) => ({ nokkel: s.nokkel, formulering })))
  if (v.type === 'seponering') return alle.map((fra) => ({ fra }))
  return alle.flatMap((fra) => alle.filter((til) => til.nokkel !== fra.nokkel || til.formulering !== fra.formulering).map((til) => ({ fra, til })))
}

/** Koden kildetabellen bruker for valget: virkestoffets egen rad i formuleringen, ellers gruppens rad for et gruppemedlem. */
export function kildekode(d: Kartdata, v: Verktoy, x: Valgtvirkestoff): string | undefined {
  const identiteter = d.kartlegging.kildeidentiteter[v.tabell]
  const egen = identiteter.find((i) => i.type === 'virkestoff' && i.virkestoff === x.nokkel && i.kildeformulering === x.formulering)
  if (egen) return egen.kode
  if (x.formulering !== 'standard') return undefined
  return d.kartlegging.grupper.find((g) => g.tabell === v.tabell && g.medlemmer.some((m) => m.virkestoff === x.nokkel))?.kode
}

/** Om kildetabellen har en lenke i cellen for bytte eller seponering (Stop-kolonnen); `undefined` når cellen ikke finnes. */
export function kildeHarAnbefaling(d: Kartdata, v: Verktoy, valg: Verktoyvalg): boolean | undefined {
  const t = d.tabeller.tabeller.find((x) => x.id === v.tabell)
  const rad = kildekode(d, v, valg.fra)
  const kolonne = valg.til ? kildekode(d, v, valg.til) : 'Stop'
  const c = t?.celler.find((x) => x.rad === rad && x.kolonne === kolonne)
  return c ? c.type === 'lenke' : undefined
}

/** Utfallet for én kombinasjon, med samme vurdering som verktøysiden. */
export function dekningsutfall(d: Kartdata, v: Verktoy, valg: Verktoyvalg): Kombinasjon {
  const t = tilgjengelighet(v, valg)
  const regler = t.regler
  switch (t.status) {
    case 'tilgjengelig':
      return { valg, utfall: 'beregning', regler }
    case 'fagtekst':
      return { valg, utfall: 'fagtekst', regler }
    case 'til_kontroll':
      return { valg, utfall: 'til_kontroll', regler }
    case 'ikke_godkjent':
      return { valg, utfall: regler.some(harBeregning) ? 'ikke_godkjent' : 'fagtekst_ikke_godkjent', regler }
  }
  if (valg.fra.formulering === 'MA' || valg.til?.formulering === 'MA') return { valg, utfall: 'mellomlang', regler: [] }
  // En godkjent regel som likevel ikke kan beregnes for valgene (et gruppemedlem som ikke er vurdert).
  if (reglerFor(v, valg).some(erKliniskGodkjent)) return { valg, utfall: 'medlem_ikke_vurdert', regler: [] }
  const dekning = valg.til ? undefined : dekningFor(v, valg.fra.nokkel)
  if (dekning && (dekning.status === 'begrenset' || dekning.status === 'mangler_anbefaling')) return { valg, utfall: 'begrenset', regler: [] }
  return { valg, utfall: kildeHarAnbefaling(d, v, valg) ? 'kilde_har_anbefaling' : 'kilde_uten_anbefaling', regler: [] }
}

export const regeldekning = (v: Verktoy, d: Kartdata = lesKartdata()): Kombinasjon[] => kombinasjoner(v).map((valg) => dekningsutfall(d, v, valg))

/* --- Syntetiske kasus ---------------------------------------------------------- */

/** Regelen et kasus i testmatrisen (P11) prøver: den kasuset bruker direkte, ellers den verktøysiden tilbyr for valgene. */
export function kasusregel(k: Pilotkasus): string | undefined {
  if (k.regel) return k.regel.id
  const v = VERKTOY.find((x) => x.id === k.verktoy)
  return v ? tilgjengelighet(v, k.valg).regler[0]?.id : undefined
}

/** Kasusene som prøver regelen uten endret regel, FEST, nødstopp eller datakilde: valgene forskriveren selv gjør. */
export const forskriverkasus = (id: string) =>
  PILOTKASUS.filter((k) => kasusregel(k) === id && !k.regel?.endre && !k.fest && !k.sperrer?.length && !['foreldet_fest', 'datakilde', 'regelendring', 'nodstopp'].includes(k.kategori))

/* --- Modellberegningen: følsomheten for trinngrensen --------------------------- */

/** Øvre grense for det foretrukne området i dag ved kort og lang behandlingstid, og grensene modellberegningen prøver (33⅓ % nøyaktig). */
export const TRINNGRENSER = { kort: [25, 100 / 3, 50], lang: [LANG_PROSENT, 25] } as const

/** En grense slik rapporten viser den: en tredjedel som brøk, ellers tallet. */
const grensetekst = (g: number) => (Math.abs(g - 100 / 3) < 1e-9 ? '33⅓' : tall(g))

/**
 * En kopi av regelen der faktisk reduksjon opp til `grense` % ikke krever
 * begrunnelse og derfor kan tilbys som valg: begrunnelseskravet uten vilkår
 * (kort) eller med vilkåret lang behandlingstid (lang) løftes til grensen.
 * Grensen fra laveste døgndose (25 %) og alt annet er uendret. Et krav om
 * komplett plan (K1) tas bort i kopien, så tabellen viser hvor langt trinnene
 * rekker, ikke bare at planen ikke er komplett. Bare til modellberegningen;
 * kopien har ingen gyldig godkjenning.
 */
export function medTrinngrense(r: Regel, grense: number, lang: boolean): Regel {
  const kopi = structuredClone(r)
  for (const f of kopi.plan.forlop) delete f.krever_komplett
  const fase = kopi.plan.forlop[0]?.faser[0]
  if (fase?.type !== 'nedtrapping' || fase.strategi.type !== 'prosent_av_aktuell') return kopi
  const p = fase.strategi.prosent
  p.begrunnelseskrav = (p.begrunnelseskrav ?? []).map((k) => (k.over !== undefined && (lang ? k.ved !== undefined : k.ved === undefined) ? { ...k, over: Math.max(k.over, grense) } : k))
  if (p.omrade) p.omrade = [p.omrade[0], Math.max(p.omrade[1], grense)]
  return kopi
}

/** Dosen nærmest `mal` % reduksjon blant dosene som tilbys, ved likt avvik den minste reduksjonen: en simulering av forskriverens valg. */
const valgNaermest = (tv: Trinnvalg, mal: number) => [...tv.doser].sort((a, b) => Math.abs(a.prosent - mal) - Math.abs(b.prosent - mal) || a.prosent - b.prosent)[0]!

/** Planen når forskriveren ved hvert trinn som ikke kan gis, velger dosen nærmest `mal` % (som scenario (h) i aksepttesten). */
export function trinnstige(u: Festuttrekk, r: Regel, form: Formalternativ, inndata: Beregningsinndata, mal: number): Doseplanresultat {
  let x = inndata
  let plan = beregnAksept(u, r, form, x)
  for (let i = 0; i < 2 * PLANHORISONT_TRINN && plan.trinnvalg?.length; i++) {
    const tv = plan.trinnvalg[0]!
    x = { ...x, trinnvalg: [...(x.trinnvalg ?? []), { forlop: tv.forlop, trinn: tv.trinn, fra_mg: tv.fra_mg, mg: valgNaermest(tv, mal).mg }] }
    plan = beregnAksept(u, r, form, x)
  }
  return plan
}

export interface Folsomhetsrad {
  nokkel: string
  form: Formalternativ
  startdose_mg: number
  lang: boolean
  /** Planen per grense, i samme rekkefølge som {@link TRINNGRENSER}. */
  planer: Doseplanresultat[]
}

/** Hovedregelen for hvert virkestoff og hver form fra vanlig dose, ved kort og lang behandlingstid, for hver grense. */
export function folsomhet(u: Festuttrekk): Folsomhetsrad[] {
  return AKSEPTSTOFFER.flatMap((s) =>
    formerFor(u, s.hoved).flatMap((form) => {
      const dose = vanligDose(s.hoved)
      const kort = besvart(s.hoved, dose)
      const lang = besvart(s.hoved, dose, { svar: LANG, justert: { [PROSENTSTI]: LANG_PROSENT } })
      const standard = s.hoved.plan.forlop[0]?.faser[0]
      const mal = standard?.type === 'nedtrapping' && standard.strategi.type === 'prosent_av_aktuell' ? (standard.strategi.prosent.verdi ?? 25) : 25
      return [
        { nokkel: s.nokkel, form, startdose_mg: dose, lang: false, planer: TRINNGRENSER.kort.map((g) => trinnstige(u, medTrinngrense(s.hoved, g, false), form, kort, mal)) },
        { nokkel: s.nokkel, form, startdose_mg: dose, lang: true, planer: TRINNGRENSER.lang.map((g) => trinnstige(u, medTrinngrense(s.hoved, g, true), form, lang, LANG_PROSENT)) },
      ]
    }),
  )
}

/** Om en dose i planen gis med delte tabletter. */
export const brukerDeling = (p: Doseplanresultat) => p.status === 'doseplan' && p.forlop.some((f) => f.perioder.some((x) => x.elementer.some((e) => !Number.isInteger(e.antall))))

/** «100 → 75 → 50 mg (2 reduksjoner)», med delte tabletter merket, eller at planen stopper før første trinn. */
export function stigetekst(startdose: number, p: Doseplanresultat): string {
  const n = reduksjoner(p)
  if (p.status !== 'doseplan' || n === 0) return 'stopper før første reduksjon'
  const doser = [startdose, ...p.forlop[0]!.perioder.map((x) => x.mg)]
  return `${doser.map(tall).join(' → ')} mg (${n} ${n === 1 ? 'reduksjon' : 'reduksjoner'}${brukerDeling(p) ? ', med delte tabletter' : ''})`
}

/* --- Rapporten ------------------------------------------------------------------ */

const navn = (d: Kartdata, nokkel: string) => d.kartlegging.virkestoffer.find((v) => v.nokkel === nokkel)?.navn ?? nokkel
const valgnavn = (d: Kartdata, x: Valgtvirkestoff, flere: boolean) => `${navn(d, x.nokkel)}${flere || x.formulering !== 'standard' ? ` (${FORMULERINGSNAVN[x.formulering].toLowerCase()})` : ''}`
const kombinasjonsnavn = (d: Kartdata, v: Verktoy, k: Verktoyvalg) => {
  const flere = (n: string) => (virkestoffvalg(v).find((s) => s.nokkel === n)?.formuleringer.length ?? 0) > 1
  return k.til ? `${valgnavn(d, k.fra, flere(k.fra.nokkel))} → ${valgnavn(d, k.til, flere(k.til.nokkel))}` : valgnavn(d, k.fra, flere(k.fra.nokkel))
}

const telling = (ks: readonly Kombinasjon[]) => Object.fromEntries(UTFALLSREKKEFOLGE.map((u) => [u, ks.filter((k) => k.utfall === u).length])) as Record<Dekningsutfall, number>

function sammendrag(alle: Map<Verktoy, Kombinasjon[]>): string {
  const hode = ['Utfall', ...[...alle.keys()].map((v) => v.navn)]
  const tellinger = [...alle.values()].map(telling)
  const rader = UTFALLSREKKEFOLGE.filter((u) => tellinger.some((t) => t[u] > 0)).map((u) => [DEKNINGSUTFALL[u], ...tellinger.map((t) => String(t[u]))])
  const valgbare = [...alle.keys()].map((v) => {
    const s = virkestoffvalg(v)
    return `${s.length} virkestoffer, ${s.reduce((n, x) => n + x.formuleringer.length, 0)} valg med formulering`
  })
  return tabell(hode, [['Valgbart', ...valgbare], ['Kombinasjoner', ...[...alle.values()].map((k) => String(k.length))], ...rader])
}

const omfangstekst = (r: Regel) => r.godkjenning.historikk.at(-1)?.merknad ?? '–'

function godkjente(d: Kartdata, alle: Map<Verktoy, Kombinasjon[]>, utfall: 'beregning' | 'fagtekst'): string {
  const rader = [...alle].flatMap(([v, ks]) => {
    const perRegel = new Map<Regel, Kombinasjon[]>()
    for (const k of ks.filter((x) => x.utfall === utfall)) for (const r of k.regler) perRegel.set(r, [...(perRegel.get(r) ?? []), k])
    return [...perRegel].map(([r, k]) => {
      const kasus = forskriverkasus(r.id)
      const planer = kasus.filter((x) => x.forventet.utfall === 'plan').length
      return [
        v.navn,
        `\`${r.id}\` v${r.versjon}`,
        k.map((x) => kombinasjonsnavn(d, v, x.valg)).join('; '),
        omfangstekst(r),
        utfall === 'beregning' ? `${kasus.length} kasus, ${planer} gir plan` : `${kasus.length} kasus`,
      ]
    })
  })
  return tabell(['Verktøy', 'Regel', 'Kombinasjon', 'Godkjent omfang (kontrollørens avgrensning)', 'Forskriverens valg i testmatrisen'], rader)
}

/** Valgene forskriveren gjør i testmatrisen som ikke gir en plan, for hver regel som kan beregnes. */
function stoppendeValg(alle: Map<Verktoy, Kombinasjon[]>): string {
  const regler = [...new Set([...alle.values()].flatMap((ks) => ks.filter((k) => k.utfall === 'beregning').flatMap((k) => k.regler)))]
  return regler
    .map((r) => {
      const stopp = forskriverkasus(r.id).filter((k) => k.forventet.utfall !== 'plan')
      const linjer = stopp.map((k) => `${k.id} (${KATEGORIER[k.kategori].toLowerCase()}): ${k.hva}, dose «${k.dose}» → ${k.forventet.utfall === 'formvalg' ? 'ber om legemiddelform' : k.forventet.utfall === 'mangler' ? 'skjemaet mangler noe' : 'ingen plan'}`)
      return `**\`${r.id}\`** – ${stopp.length} av ${forskriverkasus(r.id).length} valg gir ingen plan:\n\n${liste(linjer)}`
    })
    .join('\n\n')
}

/**
 * Hver regel uten gyldig klinisk godkjenning, med kombinasjonene den gjelder.
 * Reglene telles for seg, ikke ut fra utfallet for kombinasjonen, så en regel
 * som ikke er godkjent, er med også når en annen regel for samme kombinasjon er
 * godkjent (som den langsomme varianten for vortioksetin).
 */
function reglerUtenPlan(d: Kartdata, alle: Map<Verktoy, Kombinasjon[]>): string {
  const rader = [...alle].flatMap(([v, ks]) => {
    const perRegel = new Map<Regel, Kombinasjon[]>()
    for (const k of ks) for (const r of reglerFor(v, k.valg).filter((x) => !erKliniskGodkjent(x) && x.beregnbarhet !== 'mangler_anbefaling')) perRegel.set(r, [...(perRegel.get(r) ?? []), k])
    return [...perRegel]
      .sort(([a], [b]) => a.id.localeCompare(b.id))
      .map(([r, k]) => [v.navn, `\`${r.id}\` v${r.versjon}`, [...new Set(k.map((x) => kombinasjonsnavn(d, v, x.valg)))].join('; '), harBeregning(r) ? 'beregnbar' : 'fagtekst', kontrollutfall(r).replace(/_/g, ' ')])
  })
  return tabell(['Verktøy', 'Regel', 'Kombinasjon', 'Type', 'Kontrollutfall'], rader)
}

/** For seponering: hvert virkestoff uten regel, med forklaringen verktøyet gir. */
function utenRegelSeponering(d: Kartdata, v: Verktoy, ks: readonly Kombinasjon[]): string {
  const rader = ks
    .filter((k) => k.regler.length === 0 && k.utfall !== 'beregning')
    .map((k) => {
      const dek = dekningFor(v, k.valg.fra.nokkel)
      return [navn(d, k.valg.fra.nokkel), DEKNINGSUTFALL[k.utfall], dek ? DEKNINGSSTATUS[dek.status] : '–', tilgjengelighet(v, k.valg).grunner.join(' ')]
    })
  return tabell(['Virkestoff', 'Utfall', 'Status i P7-dekningen', 'Forklaringen verktøyet gir'], rader)
}

/** For bytte: per fra-valg, hvor mange kombinasjoner som har en regel, og hvor mange uten regel kilden har eller ikke har en anbefaling for. */
function utenRegelBytte(d: Kartdata, v: Verktoy, ks: readonly Kombinasjon[]): string {
  const fra = [...new Map(ks.map((k) => [`${k.valg.fra.nokkel}|${k.valg.fra.formulering}`, k.valg.fra])).values()]
  const rader = fra.map((f) => {
    const egne = ks.filter((k) => k.valg.fra.nokkel === f.nokkel && k.valg.fra.formulering === f.formulering)
    const n = (u: Dekningsutfall[]) => String(egne.filter((k) => u.includes(k.utfall)).length)
    return [
      kombinasjonsnavn(d, v, { fra: f }),
      String(egne.length),
      n(['beregning', 'fagtekst']),
      n(['ikke_godkjent', 'fagtekst_ikke_godkjent', 'til_kontroll', 'medlem_ikke_vurdert']),
      n(['kilde_har_anbefaling']),
      n(['kilde_uten_anbefaling']),
      n(['mellomlang']),
    ]
  })
  return tabell(['Fra', 'Til-valg', 'Plan eller godkjent fagtekst', 'Regel uten godkjenning', 'Ingen regel, kilden har anbefaling', 'Ingen regel, kilden har ingen', 'Middels langtidsvirkende'], rader)
}

function folsomhetstabell(rader: readonly Folsomhetsrad[], lang: boolean): string {
  const grenser = lang ? TRINNGRENSER.lang : TRINNGRENSER.kort
  const hode = ['Virkestoff', 'Form', 'Startdose', ...grenser.map((g, i) => `${i === 0 ? 'I dag: ' : ''}høyst ${grensetekst(g)} %`)]
  return tabell(
    hode,
    rader.filter((r) => r.lang === lang).map((r) => [r.nokkel, r.form.navn, `${tall(r.startdose_mg)} mg`, ...r.planer.map((p) => stigetekst(r.startdose_mg, p))]),
  )
}

export function lagRegeldekningsrapport(u: Festuttrekk, d: Kartdata = lesKartdata()): string {
  const alle = new Map(VERKTOY.map((v) => [v, regeldekning(v, d)] as const))
  const seponering = VERKTOY.find((v) => v.type === 'seponering')!
  const bytte = VERKTOY.filter((v) => v.type === 'bytte')
  const godkjenteRegler = REGELSETT.regler.filter(erKliniskGodkjent)
  const rader = folsomhet(u)
  return `# OUSFAR Verktøy – VDK-1: klinisk regeldekning i de tre verktøyene

<!-- Laget av \`npm run verktoy:regler -- regeldekning\` fra src/verktoy/regeldekning.ts, regelsettet, testmatrisen (P11) og FEST-uttrekket til aksepttesten. Ikke rediger for hånd. -->

Oversikten svarer på VDK-1 i \`docs/verktøy-omlegging-2026-11.md\`: hva de tre verktøyene faktisk kan beregne i dag, hva som bare gir fagtekst, og hvorfor de andre valgene stopper. Hver kombinasjon forskriveren kan velge, er kjørt gjennom den samme tilgjengelighetsvurderingen som verktøysiden (\`src/verktoy/tilgjengelighet.ts\`), så tallene er det appen gjør, ikke et anslag. «Vanlige valg som stopper» er de syntetiske kasusene i testmatrisen fra P11, ikke antakelser om bruk. Prioriteringen av hva som bør ferdigstilles først, står i \`docs/verktøy-vdk2-prioritering.md\`.

Kildetabellen fra Psychiatrienet er bare brukt som metadata som allerede ligger i repoet (om tabellen har en anbefaling for kombinasjonen), og bare i sum. Ingen tekst fra kilden er brukt, og at kilden har en anbefaling, gir aldri i seg selv en OUSFAR-regel (\`docs/verktøy-p3-rettigheter.md\`).

**Regelsettet har ${godkjenteRegler.length} klinisk godkjente regelversjoner** (${godkjenteRegler.map((r) => `\`${r.id}\` v${r.versjon}`).join(', ')}), ${godkjenteRegler.filter(harBeregning).length} av dem med beregning, hver bare i omfanget kontrolløren godkjente.

## 1. Sammendrag

Antall kombinasjoner etter hva verktøyet gir. For seponering er en kombinasjon ett virkestoff i én formulering; for bytte et ordnet par av ulike valg (fra → til), også mellom formuleringer av samme virkestoff. En kombinasjon med «beregning» gir en plan bare for de startdosene, svarene og preparatene regelen er godkjent for (avsnitt 2); alt annet stopper med forklaring.

${sammendrag(alle)}

## 2. Hva kan beregnes i dag

Hver klinisk godkjente regel med beregning, kombinasjonen den gjelder, og omfanget slik kontrolløren avgrenset det. Siste kolonne teller kasusene i testmatrisen (\`docs/verktøy-p11-testmatrise.md\`) der bare forskriverens valg varierer (dose, svar, form, dato), ikke kasusene som endrer regelen, FEST, nødstoppen eller datakildene.

${godkjente(d, alle, 'beregning')}

## 3. Klinisk godkjent fagtekst uten beregning

${godkjente(d, alle, 'fagtekst')}

## 4. Vanlige valg som stopper innenfor de godkjente reglene

Valgene i testmatrisen som ikke gir en plan, selv om regelen er godkjent: dosen, svarene eller formen ligger utenfor det godkjente omfanget, et trinn kan ikke gis med preparatene, eller planen når ikke sluttmålet: en delplan vises aldri, heller ikke etter en tidligere godkjent regelversjon (Peders beslutning 03.11.2026).

${stoppendeValg(alle)}

## 5. Regler som finnes, men ikke gir plan

Regelutkast som er kontrollert og ikke godkjent (eller bare fagtekst), og som derfor aldri gir en plan: verktøyet viser «kontrollert, ikke godkjent» eller «bare fagtekst, ikke beregnbar», eller, der en annen regel for samme kombinasjon er godkjent, stopper når valgene peker på denne regelen (som den langsomme varianten for vortioksetin etter tidligere seponeringsplager). Hvorfor hver av dem ikke er godkjent, står i \`docs/verktøy-p7-nedtrapping.md\` §11 og \`docs/verktøy-p4-regelmodell.md\` §11.

${reglerUtenPlan(d, alle)}

## 6. Hvorfor de andre kombinasjonene stopper

### ${seponering.navn}

${utenRegelSeponering(d, seponering, alle.get(seponering)!)}

${bytte
  .map(
    (v) => `### ${v.navn}

Per fra-valg: hvor mange til-valg som gir plan eller godkjent fagtekst, hvor mange som har en regel uten godkjenning, og hvor mange som ikke har noen OUSFAR-regel, delt etter om kildetabellen har en anbefaling for kombinasjonen. En anbefaling i kildetabellen er ikke en OUSFAR-regel; uten tillatelse fra utgiveren lages reglene som selvstendige vurderinger per kombinasjon, ikke som en systematisk overføring av tabellen.

${utenRegelBytte(d, v, alle.get(v)!)}`,
  )
  .join('\n\n')}

## 7. Modellberegning: hvor langt nedtrappingsreglene kommer med norske styrker

**Dette er et beslutningsgrunnlag til faglig kontroll, ikke en regel, en anbefaling eller noe verktøyet bruker.** Hovedregelen for hvert beregnbare virkestoff er regnet med de markedsførte preparatene i FEST-uttrekket ${u.hentet.slice(0, 10)} fra regelens vanlige dose (som i aksepttesten, \`docs/verktøy-p7-aksepttest.md\`). Ved hvert trinn som ikke kan gis nøyaktig, velges dosen nærmest regelens forslag blant dosene som tilbys (en simulering av forskriverens valg, som scenario (h) i aksepttesten). Det eneste som endres, er den øvre grensen for en faktisk reduksjon som kan tilbys uten begrunnelse; i dag er den 25 % ved kort og ${LANG_PROSENT} % ved lang behandlingstid. Grensen på 25 % fra laveste døgndose, horisonten på ${PLANHORISONT_TRINN} reduksjoner, toleransen (ingen), delingsreglene og alt annet er uendret. Ingen plan går til null.

Tabellene viser derfor hvor mye av begrensningen som skyldes trinngrensen, og hvor mye som skyldes styrkene og delingen. «Med delte tabletter» betyr at minst én dose deler en tablett FEST oppgir som delbar; for klomipramin er deling utenfor regelens kliniske omfang (kontrollørens gjennomgang av d6cc3dd). De sier ingenting om hvilken grense som er klinisk forsvarlig; det er spørsmålet i \`docs/verktøy-vdk2-prioritering.md\`.

### Kort behandlingstid (regelens forslag per trinn)

${folsomhetstabell(rader, false)}

### Lang behandlingstid (forslag ${LANG_PROSENT} % per trinn)

${folsomhetstabell(rader, true)}
`
}
