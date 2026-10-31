/**
 * Godkjenningen av en regel er bundet til nøyaktig den regelversjonen og det
 * innholdet som ble kontrollert (P4 i `docs/verktøy-utviklingsplan.md`).
 *
 * Et godkjenningssteg bærer regelversjonen og regelens **fingeravtrykk**:
 * SHA-256 av regelen i kanonisk form (alt unntatt godkjenningen), sammen med
 * versjonene til kildene den viser til. Endres planen, en verdi, en
 * betingelse, fortolkningen, et eksempel eller en kilde etter godkjenningen,
 * stemmer ikke fingeravtrykket lenger, og regelen er ikke klinisk godkjent
 * før den er kontrollert på nytt. Ren JavaScript, så det samme kan regnes ut
 * i nettleseren.
 */
import { kildeFor } from './kilder'
import { alleGrunnlag, apneValg, henvisninger, nulltrinnfeil, type Godkjenningssteg, type Regel } from './modell'

/** JSON med sorterte nøkler, uten udefinerte felt, og med RegExp som kilde og flagg. */
export function kanonisk(x: unknown): string {
  if (x instanceof RegExp) return JSON.stringify({ regexp: x.source, flagg: x.flags })
  if (Array.isArray(x)) return `[${x.map((y) => (y === undefined ? 'null' : kanonisk(y))).join(',')}]`
  if (x && typeof x === 'object') {
    const felt = Object.entries(x)
      .filter(([, y]) => y !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${felt.map(([n, y]) => `${JSON.stringify(n)}:${kanonisk(y)}`).join(',')}}`
  }
  return JSON.stringify(x)
}

const K = Uint32Array.from(
  '428a2f98 71374491 b5c0fbcf e9b5dba5 3956c25b 59f111f1 923f82a4 ab1c5ed5 d807aa98 12835b01 243185be 550c7dc3 72be5d74 80deb1fe 9bdc06a7 c19bf174 e49b69c1 efbe4786 0fc19dc6 240ca1cc 2de92c6f 4a7484aa 5cb0a9dc 76f988da 983e5152 a831c66d b00327c8 bf597fc7 c6e00bf3 d5a79147 06ca6351 14292967 27b70a85 2e1b2138 4d2c6dfc 53380d13 650a7354 766a0abb 81c2c92e 92722c85 a2bfe8a1 a81a664b c24b8b70 c76c51a3 d192e819 d6990624 f40e3585 106aa070 19a4c116 1e376c08 2748774c 34b0bcb5 391c0cb3 4ed8aa4a 5b9cca4f 682e6ff3 748f82ee 78a5636f 84c87814 8cc70208 90befffa a4506ceb bef9a3f7 c67178f2'
    .split(' ')
    .map((h) => parseInt(h, 16)),
)

/** SHA-256 av teksten som UTF-8, heksadesimalt. */
export function sha256(tekst: string): string {
  const data = new TextEncoder().encode(tekst)
  const lengde = Math.ceil((data.length + 9) / 64) * 64
  const blokk = new Uint8Array(lengde)
  blokk.set(data)
  blokk[data.length] = 0x80
  const visning = new DataView(blokk.buffer)
  visning.setUint32(lengde - 8, Math.floor((data.length * 8) / 2 ** 32))
  visning.setUint32(lengde - 4, (data.length * 8) >>> 0)
  const h = Uint32Array.from([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
  const w = new Uint32Array(64)
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))
  for (let i = 0; i < lengde; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = visning.getUint32(i + t * 4)
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15]!, 7) ^ rotr(w[t - 15]!, 18) ^ (w[t - 15]! >>> 3)
      const s1 = rotr(w[t - 2]!, 17) ^ rotr(w[t - 2]!, 19) ^ (w[t - 2]! >>> 10)
      w[t] = (w[t - 16]! + s0 + w[t - 7]! + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h as unknown as number[]
    for (let t = 0; t < 64; t++) {
      const t1 = (hh! + (rotr(e!, 6) ^ rotr(e!, 11) ^ rotr(e!, 25)) + ((e! & f!) ^ (~e! & g!)) + K[t]! + w[t]!) >>> 0
      const t2 = ((rotr(a!, 2) ^ rotr(a!, 13) ^ rotr(a!, 22)) + ((a! & b!) ^ (a! & c!) ^ (b! & c!))) >>> 0
      hh = g
      g = f
      f = e
      e = (d! + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    ;[a, b, c, d, e, f, g, hh].forEach((x, j) => (h[j] = (h[j]! + x!) >>> 0))
  }
  return [...h].map((x) => x.toString(16).padStart(8, '0')).join('')
}

/** Fingeravtrykket av regelens faglige innhold: alt unntatt godkjenningen, og versjonene til kildene den viser til. */
export function fingeravtrykk(r: Regel): string {
  const { godkjenning: _, ...innhold } = r
  const kilder = [...new Set(henvisninger(r).map((h) => h.kilde))].sort().map((id) => {
    const k = kildeFor(id)
    return k ? { id, versjon: k.versjon, sha256: k.sha256 } : { id }
  })
  return sha256(kanonisk({ regel: innhold, kilder }))
}

/**
 * Hvorfor regelen ikke er gyldig klinisk godkjent; tom når den er det. Gyldig
 * godkjent er den bare når siste steg er en klinisk godkjenning fra en
 * uavhengig kontrollør (ingen som har vært utvikler av regelen), for denne
 * regelversjonen og dette fingeravtrykket, og regelen ikke har åpne valg
 * igjen. OUSFARs egne vurderinger kan godkjennes når hver er eksplisitt
 * avklart av en som ikke er utvikler; de beholder sin opprinnelse.
 */
export function godkjenningsfeil(r: Regel): string[] {
  const g = r.godkjenning
  const sist = g.historikk.at(-1)
  if (g.status !== 'klinisk_godkjent') return [`Regelversjonen er ${g.status.replace(/_/g, ' ')}, ikke klinisk godkjent.`]
  const feil: string[] = []
  const utviklere = new Set(g.historikk.filter((s) => s.rolle === 'utvikler').map((s) => s.av))
  if (!sist || sist.status !== 'klinisk_godkjent' || sist.rolle !== 'uavhengig_kontrollor' || utviklere.has(sist.av)) {
    feil.push('Siste steg er ikke en klinisk godkjenning fra en uavhengig kontrollør.')
  }
  if (sist && sist.regelversjon !== r.versjon) feil.push(`Godkjenningen gjelder regelversjon ${sist.regelversjon}, ikke versjon ${r.versjon}.`)
  if (sist && sist.fingeravtrykk !== fingeravtrykk(r)) feil.push('Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt.')
  for (const x of nulltrinnfeil(r)) feil.push(`Regelen er ugyldig: ${x}.`)
  const apne = apneValg(r)
  if (apne.length > 0) feil.push(`Regelen har åpne valg som må avklares faglig: ${apne.join(', ')}.`)
  for (const [sti, gr] of alleGrunnlag(r)) {
    if (gr.type === 'ousfar_vurdering' && gr.avklaring && utviklere.has(gr.avklaring.av)) feil.push(`Valget ${sti} er avklart av en utvikler av regelen, ikke uavhengig.`)
  }
  return feil
}

export const erKliniskGodkjent = (r: Regel) => godkjenningsfeil(r).length === 0

/**
 * Utfallet av den faglige kontrollen for en regel, slik verktøyet og
 * rapportene sier det: godkjent i det oppgitte omfanget, kontrollert og ikke
 * godkjent, bare fagtekst (kontrollert, men uten beregning), eller fortsatt
 * til kontroll. En regel som er vurdert og ikke godkjent, er ikke et åpent
 * klinisk spørsmål.
 */
export type Kontrollutfall = 'godkjent' | 'ikke_godkjent' | 'bare_fagtekst' | 'til_kontroll'

export const KONTROLLUTFALL: Record<Kontrollutfall, string> = {
  godkjent: 'kontrollert og godkjent i oppgitt omfang',
  ikke_godkjent: 'kontrollert, ikke godkjent',
  bare_fagtekst: 'bare fagtekst, ikke beregnbar',
  til_kontroll: 'ikke ferdig kontrollert',
}

/** Om regelen har en beregning; en regel som bare er tekstlig eller mangler anbefaling, har det ikke. */
export const harBeregning = (r: Regel) => r.beregnbarhet !== 'bare_tekstlig' && r.beregnbarhet !== 'mangler_anbefaling'

/** Statusene der kontrollen er avsluttet uten godkjenning. */
const AVSLUTTET: readonly Regel['godkjenning']['status'][] = ['ikke_godkjent', 'avvist', 'trukket']

/**
 * Om en avsluttet vurdering uten godkjenning gjelder nøyaktig denne regelen:
 * siste steg er fra en uavhengig kontrollør, for denne versjonen og dette
 * fingeravtrykket. Endres regelen etterpå, gjelder vurderingen ikke lenger.
 */
export function vurderingsfeil(r: Regel): string[] {
  const sist = r.godkjenning.historikk.at(-1)
  if (!AVSLUTTET.includes(r.godkjenning.status)) return [`Regelversjonen er ${r.godkjenning.status.replace(/_/g, ' ')}, ikke vurdert.`]
  const feil: string[] = []
  const utviklere = new Set(r.godkjenning.historikk.filter((x) => x.rolle === 'utvikler').map((x) => x.av))
  if (!sist || sist.status !== r.godkjenning.status || sist.rolle !== 'uavhengig_kontrollor' || utviklere.has(sist.av)) feil.push('Siste steg er ikke en vurdering fra en uavhengig kontrollør.')
  if (sist && sist.regelversjon !== r.versjon) feil.push(`Vurderingen gjelder regelversjon ${sist.regelversjon}, ikke versjon ${r.versjon}.`)
  if (sist && sist.fingeravtrykk !== fingeravtrykk(r)) feil.push('Regelen er endret etter vurderingen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt.')
  return feil
}

export function kontrollutfall(r: Regel): Kontrollutfall {
  if (erKliniskGodkjent(r)) return 'godkjent'
  // En godkjenning eller vurdering som ikke lenger gjelder innholdet (endret regel), må kontrolleres på nytt.
  if (vurderingsfeil(r).length > 0) return 'til_kontroll'
  return harBeregning(r) ? 'ikke_godkjent' : 'bare_fagtekst'
}

/** Én regel kontrolløren har vurdert og ikke godkjent: nøyaktig versjonen og innholdet som ble vurdert. */
export interface Vurdertregel {
  versjon: number
  fingeravtrykk: string
  /** Det kontrolløren sa om akkurat denne regelen, i tillegg til den felles merknaden. */
  tillegg?: string
}

/** Kontrollørens vurdering av en leveranse: hvem, når, hva den sier om regler med og uten beregning, og hvilke regler den gjelder. */
export interface Disposisjon {
  av: string
  dato: string
  /** Begrunnelsen for en beregnbar regel og for en regel uten beregning. */
  merknad: { beregnbar: string; uten_beregning: string }
  /** De vurderte reglene (id → versjon og fingeravtrykk); en regel som ikke står her, er ikke vurdert. */
  regler: Readonly<Record<string, Vurdertregel>>
}

/**
 * Registrerer disposisjonen bare for reglene den nevner, og bare når versjonen
 * og fingeravtrykket er nøyaktig det kontrolløren vurderte; steget får
 * fingeravtrykket. En regel som er endret, har fått ny versjon eller ikke står
 * i listen, får ikke noe steg og står som før, til en ny vurdering er
 * registrert. En klinisk godkjent regel er uendret. Fingeravtrykkene endres
 * ikke, siden godkjenningen ikke inngår i dem.
 */
export function disponer(regler: Regel[], d: Disposisjon): Regel[] {
  return regler.map((r) => {
    const v = d.regler[r.id]
    if (!v || r.godkjenning.status === 'klinisk_godkjent' || v.versjon !== r.versjon) return r
    const avtrykk = fingeravtrykk(r)
    if (avtrykk !== v.fingeravtrykk) return r
    const merknad = [harBeregning(r) ? d.merknad.beregnbar : d.merknad.uten_beregning, v.tillegg].filter(Boolean).join(' ')
    const steg: Godkjenningssteg = { status: 'ikke_godkjent', dato: d.dato, av: d.av, rolle: 'uavhengig_kontrollor', regelversjon: r.versjon, fingeravtrykk: avtrykk, merknad }
    return { ...r, godkjenning: { status: 'ikke_godkjent', historikk: [...r.godkjenning.historikk, steg] } }
  })
}

/** De vurderte reglene disposisjonen ikke kunne registreres for: regelen mangler, har en annen versjon eller et annet innhold. */
export function disposisjonsfeil(regler: readonly Regel[], d: Disposisjon): string[] {
  return Object.entries(d.regler).flatMap(([id, v]) => {
    const r = regler.find((x) => x.id === id)
    if (!r) return [`${id}: regelen finnes ikke i settet`]
    if (r.versjon !== v.versjon) return [`${id}: vurdert som versjon ${v.versjon}, men regelen er versjon ${r.versjon}`]
    return fingeravtrykk(r) === v.fingeravtrykk ? [] : [`${id}: innholdet er endret etter vurderingen (fingeravtrykket stemmer ikke)`]
  })
}
