/**
 * Skånsomme, sammenlignbare målinger av produksjonsdatabasen (docs/db-maling.md).
 *
 * Hver måling er et øyeblikksbilde av tellere som bare vokser (swap, sidefeil,
 * disk, midlertidige filer, funksjonskall) pluss trafikken i API-et siden
 * forrige måling. Forskjellen mellom to målinger gir rater for perioden mellom
 * dem, og fasene (kapasitet × siste migrering) skiller effekten av mindre
 * QA-trafikk, SQL-endringer og en eventuell oppgradering.
 *
 * Alt her er rene funksjoner; innhentingen står i `scripts/db-maling.ts`.
 */

/** Postgres-blokker er 8 kB. */
const BLOKK = 8192
const MB = 1e6
/** Linux-sider (swap) er 4 kB på Supabase-maskinene. */
const SIDE = 4096

/** Funksjonene tabellene viser svartid og midlertidige filer for. */
export const NOKKELFUNKSJONER = ['les_stoff', 'les_stoffer'] as const

/** En periode med færre kall i timen enn dette regnes som rolig drift. */
export const ROLIG_KALL_PER_TIME = 100

export interface Funksjonsteller {
  kall: number
  totalMs: number
  tempBlokker: number
}

export interface Rpctrafikk {
  kall: number
  feil5xx: number
  p50Ms: number
  p95Ms: number
}

export interface Trafikk {
  fra: string
  til: string
  kall: number
  feil5xx: number
  /** Kall fra automatiserte nettlesere (HeadlessChrome, Playwright). */
  automatisert: number
  /** Spørringer Postgres avbrøt på tidsgrense. */
  tidsavbrudd: number
  rpc: Record<string, Rpctrafikk>
}

export interface Maling {
  versjon: 1
  tid: string
  /** Når maskinen startet; tellerne begynner på null ved hver oppstart. */
  oppstart: string
  kapasitet: { beregning: string; minneMB: number }
  sistMigrering: string | null
  /** Summen av alle databasene, det samme tallet Supabase måler mot kvoten. */
  databaseMB: number
  minne: { ledigMB: number; swapBruktMB: number }
  teller: {
    swapInnSider: number
    swapUtSider: number
    storeSidefeil: number
    diskOperasjoner: number
    diskMB: number
    tempMB: number
    tempFiler: number
  }
  /** Når pg_stat_statements sist ble nullstilt; funksjonstellerne gjelder siden da. */
  statistikkFra: string | null
  funksjoner: Record<string, Funksjonsteller>
  trafikk: Trafikk
}

export type Metrikker = Map<string, number>

/** Leser Prometheus-tekst; verdier med samme navn og ulike merker summeres (f.eks. alle disker). */
export function lesMetrikker(tekst: string): Metrikker {
  const ut: Metrikker = new Map()
  for (const linje of tekst.split('\n')) {
    if (!linje || linje.startsWith('#')) continue
    const m = /^([a-zA-Z_:][\w:]*)(\{[^}]*\})?\s+(\S+)/.exec(linje)
    if (!m) continue
    const [, navn, merker = '', verdi] = m
    // Bare ekte disker, ikke loop- eller minnedisker.
    if (/device="(loop|ram|dm-)/.test(merker)) continue
    const tall = Number(verdi)
    if (!Number.isFinite(tall)) continue
    ut.set(navn as string, (ut.get(navn as string) ?? 0) + tall)
  }
  return ut
}

function metrikk(m: Metrikker, navn: string): number {
  const verdi = m.get(navn)
  if (verdi === undefined) throw new Error(`Metrikken ${navn} mangler i svaret fra Supabase.`)
  return verdi
}

const avrund = (tall: number, desimaler = 1) => Math.round(tall * 10 ** desimaler) / 10 ** desimaler

/** Øyeblikksbildet fra maskinens metrikker. */
export function fraMetrikker(m: Metrikker): Pick<Maling, 'oppstart' | 'minne' | 'teller'> & { minneMB: number } {
  return {
    oppstart: new Date(metrikk(m, 'node_boot_time_seconds') * 1000).toISOString(),
    minneMB: avrund(metrikk(m, 'node_memory_MemTotal_bytes') / MB, 0),
    minne: {
      ledigMB: avrund(metrikk(m, 'node_memory_MemAvailable_bytes') / MB, 0),
      swapBruktMB: avrund((metrikk(m, 'node_memory_SwapTotal_bytes') - metrikk(m, 'node_memory_SwapFree_bytes')) / MB, 0),
    },
    teller: {
      swapInnSider: metrikk(m, 'node_vmstat_pswpin'),
      swapUtSider: metrikk(m, 'node_vmstat_pswpout'),
      storeSidefeil: metrikk(m, 'node_vmstat_pgmajfault'),
      diskOperasjoner: metrikk(m, 'node_disk_reads_completed_total') + metrikk(m, 'node_disk_writes_completed_total'),
      diskMB: avrund((metrikk(m, 'node_disk_read_bytes_total') + metrikk(m, 'node_disk_written_bytes_total')) / MB),
      tempMB: avrund(metrikk(m, 'pg_stat_database_temp_bytes_total') / MB),
      tempFiler: metrikk(m, 'pg_stat_database_temp_files_total'),
    },
  }
}

/** Navnet på kapasitetstillegget, eller «nano» når prosjektet ikke har noe. */
export function beregningsstorrelse(tillegg: unknown): string {
  const valgt = (tillegg as { selected_addons?: { type?: string; variant?: { id?: string } }[] } | null)?.selected_addons ?? []
  const beregning = valgt.find((t) => t.type === 'compute_instance')?.variant?.id
  return beregning ? beregning.replace(/^ci_/, '') : 'nano'
}

export interface Periode {
  fra: string
  til: string
  timer: number
  /** Fasen perioden hører til: kapasitet og siste migrering ved periodens slutt. */
  fase: string
  rolig: boolean
  kallPerTime: number
  automatisertAndel: number
  feilAndel: number
  tidsavbrudd: number
  swapInnPerS: number
  swapUtPerS: number
  swapMBPerS: number
  sidefeilPerS: number
  iops: number
  diskMBPerS: number
  tempMBPerTime: number
  databaseMB: number
  /** Per nøkkelfunksjon: snittid og midlertidige filer per vellykket kall i perioden, svartid i API-et. */
  funksjoner: Record<string, { kall: number; snittMs: number | null; tempMBPerKall: number | null; p95Ms: number | null; feilAndel: number | null }>
}

export const fasenavn = (m: Pick<Maling, 'kapasitet' | 'sistMigrering'>) => `${m.kapasitet.beregning} · migrering ${m.sistMigrering ?? '–'}`

/**
 * Periodene mellom målingene. Et par der maskinen har startet på nytt mellom
 * dem, hoppes over, fordi tellerne da har begynt på null igjen.
 */
export function perioder(malinger: readonly Maling[]): Periode[] {
  const sortert = [...malinger].sort((a, b) => a.tid.localeCompare(b.tid))
  const ut: Periode[] = []
  for (let i = 1; i < sortert.length; i++) {
    const a = sortert[i - 1] as Maling
    const b = sortert[i] as Maling
    const sek = (Date.parse(b.tid) - Date.parse(a.tid)) / 1000
    if (sek <= 0 || a.oppstart !== b.oppstart) continue
    const d = (felt: keyof Maling['teller']) => b.teller[felt] - a.teller[felt]
    if (d('swapInnSider') < 0 || d('diskOperasjoner') < 0) continue
    const timer = sek / 3600
    const t = b.trafikk
    const sammeStatistikk = a.statistikkFra === b.statistikkFra
    const funksjoner: Periode['funksjoner'] = {}
    for (const navn of NOKKELFUNKSJONER) {
      const fa = a.funksjoner[navn] ?? { kall: 0, totalMs: 0, tempBlokker: 0 }
      const fb = b.funksjoner[navn] ?? { kall: 0, totalMs: 0, tempBlokker: 0 }
      const kall = sammeStatistikk ? fb.kall - fa.kall : 0
      const rpc = t.rpc[navn]
      funksjoner[navn] = {
        kall,
        snittMs: kall > 0 ? avrund((fb.totalMs - fa.totalMs) / kall, 0) : null,
        tempMBPerKall: kall > 0 ? avrund(((fb.tempBlokker - fa.tempBlokker) * BLOKK) / MB / kall) : null,
        p95Ms: rpc && rpc.kall > 0 ? rpc.p95Ms : null,
        feilAndel: rpc && rpc.kall > 0 ? avrund(rpc.feil5xx / rpc.kall, 3) : null,
      }
    }
    // Trafikkvinduet er forskjøvet litt bakover (loggene kommer fram sent), men har sin egen lengde.
    const trafikkTimer = (Date.parse(t.til) - Date.parse(t.fra)) / 3600_000
    const kallPerTime = avrund(t.kall / (trafikkTimer > 0 ? trafikkTimer : timer))
    ut.push({
      fra: a.tid,
      til: b.tid,
      timer: avrund(timer, 2),
      fase: fasenavn(b),
      rolig: kallPerTime < ROLIG_KALL_PER_TIME,
      kallPerTime,
      automatisertAndel: t.kall > 0 ? avrund(t.automatisert / t.kall, 3) : 0,
      feilAndel: t.kall > 0 ? avrund(t.feil5xx / t.kall, 3) : 0,
      tidsavbrudd: t.tidsavbrudd,
      swapInnPerS: avrund(d('swapInnSider') / sek),
      swapUtPerS: avrund(d('swapUtSider') / sek),
      swapMBPerS: avrund(((d('swapInnSider') + d('swapUtSider')) * SIDE) / MB / sek, 2),
      sidefeilPerS: avrund(d('storeSidefeil') / sek),
      iops: avrund(d('diskOperasjoner') / sek),
      diskMBPerS: avrund(d('diskMB') / sek, 2),
      tempMBPerTime: avrund(d('tempMB') / timer),
      databaseMB: b.databaseMB,
      funksjoner,
    })
  }
  return ut
}

export interface Fasesammendrag {
  fase: string
  fra: string
  til: string
  perioder: number
  /** Snittet for periodene i rolig drift; null når fasen ikke har noen. */
  rolig: { swapMBPerS: number; sidefeilPerS: number; iops: number } | null
  /** Snittet for alle periodene, vektet med lengden. */
  alle: { kallPerTime: number; automatisertAndel: number; feilAndel: number; iops: number; tempMBPerTime: number }
  funksjoner: Record<string, { kall: number; snittMs: number | null; tempMBPerKall: number | null }>
}

function vektetSnitt<T>(liste: readonly T[], verdi: (x: T) => number, vekt: (x: T) => number): number {
  const sum = liste.reduce((s, x) => s + vekt(x), 0)
  return sum > 0 ? liste.reduce((s, x) => s + verdi(x) * vekt(x), 0) / sum : 0
}

/** Snittet per fase, så effekten av en kapasitets- eller SQL-endring kan leses for seg. */
export function faser(liste: readonly Periode[]): Fasesammendrag[] {
  const grupper = new Map<string, Periode[]>()
  for (const p of liste) grupper.set(p.fase, [...(grupper.get(p.fase) ?? []), p])
  return [...grupper].map(([fase, ps]) => {
    const rolige = ps.filter((p) => p.rolig)
    const timer = (p: Periode) => p.timer
    const funksjoner: Fasesammendrag['funksjoner'] = {}
    for (const navn of NOKKELFUNKSJONER) {
      const medKall = ps.filter((p) => (p.funksjoner[navn]?.kall ?? 0) > 0)
      const kall = medKall.reduce((s, p) => s + (p.funksjoner[navn]?.kall ?? 0), 0)
      const vekt = (p: Periode) => p.funksjoner[navn]?.kall ?? 0
      funksjoner[navn] = {
        kall,
        snittMs: kall > 0 ? avrund(vektetSnitt(medKall, (p) => p.funksjoner[navn]?.snittMs ?? 0, vekt), 0) : null,
        tempMBPerKall: kall > 0 ? avrund(vektetSnitt(medKall, (p) => p.funksjoner[navn]?.tempMBPerKall ?? 0, vekt)) : null,
      }
    }
    return {
      fase,
      fra: ps[0]?.fra ?? '',
      til: ps.at(-1)?.til ?? '',
      perioder: ps.length,
      rolig: rolige.length
        ? {
            swapMBPerS: avrund(vektetSnitt(rolige, (p) => p.swapMBPerS, timer), 2),
            sidefeilPerS: avrund(vektetSnitt(rolige, (p) => p.sidefeilPerS, timer)),
            iops: avrund(vektetSnitt(rolige, (p) => p.iops, timer)),
          }
        : null,
      alle: {
        kallPerTime: avrund(vektetSnitt(ps, (p) => p.kallPerTime, timer)),
        automatisertAndel: avrund(vektetSnitt(ps, (p) => p.automatisertAndel, timer), 3),
        feilAndel: avrund(vektetSnitt(ps, (p) => p.feilAndel, timer), 3),
        iops: avrund(vektetSnitt(ps, (p) => p.iops, timer)),
        tempMBPerTime: avrund(vektetSnitt(ps, (p) => p.tempMBPerTime, timer)),
      },
      funksjoner,
    }
  })
}

const prosent = (andel: number | null) => (andel === null ? '–' : `${avrund(andel * 100)} %`)
const tall = (verdi: number | null, enhet = '') => (verdi === null ? '–' : `${verdi}${enhet}`)
const kort = (iso: string) => iso.slice(5, 16).replace('T', ' ')

/** Rapporten i Markdown: fasene først, så de siste periodene. */
export function rapport(malinger: readonly Maling[], antallPerioder = 16): string {
  const ps = perioder(malinger)
  const sist = [...malinger].sort((a, b) => a.tid.localeCompare(b.tid)).at(-1)
  const linjer: string[] = ['## Databasemåling', '']
  if (sist) {
    linjer.push(
      `Siste måling ${kort(sist.tid)} UTC: ${sist.kapasitet.beregning} med ${sist.kapasitet.minneMB} MB minne, ` +
        `${sist.minne.ledigMB} MB ledig, ${sist.minne.swapBruktMB} MB i swap, databasen ${sist.databaseMB} MB.`,
      '',
    )
  }
  if (!ps.length) return [...linjer, 'For få målinger til å regne ut perioder ennå.'].join('\n')
  const [f1, f2] = NOKKELFUNKSJONER
  linjer.push(
    '### Faser',
    '',
    `Rolig drift er perioder med under ${ROLIG_KALL_PER_TIME} kall i timen. Svartid og temp per kall gjelder vellykkede kall.`,
    '',
    `| Fase | Periode (UTC) | Kall/t | Automatisert | 5xx | Swap MB/s (rolig) | Sidefeil/s (rolig) | IOPS (rolig) | IOPS (alle) | Temp MB/t | ${f1} ms · MB/kall | ${f2} ms · MB/kall |`,
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
  )
  for (const f of faser(ps)) {
    const fn = (navn: string) => {
      const x = f.funksjoner[navn]
      return x && x.kall > 0 ? `${x.snittMs} · ${x.tempMBPerKall} (${x.kall})` : '–'
    }
    linjer.push(
      `| ${f.fase} | ${kort(f.fra)}–${kort(f.til)} | ${f.alle.kallPerTime} | ${prosent(f.alle.automatisertAndel)} | ${prosent(f.alle.feilAndel)} | ` +
        `${tall(f.rolig?.swapMBPerS ?? null)} | ${tall(f.rolig?.sidefeilPerS ?? null)} | ${tall(f.rolig?.iops ?? null)} | ${f.alle.iops} | ${f.alle.tempMBPerTime} | ${fn(f1)} | ${fn(f2)} |`,
    )
  }
  linjer.push(
    '',
    '### Siste perioder',
    '',
    `| Periode (UTC) | Kall/t | Automatisert | 5xx | Tidsavbrudd | Swap MB/s | Sidefeil/s | IOPS | Temp MB/t | ${f1} p95 | ${f2} p95 | DB MB |`,
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
  )
  for (const p of ps.slice(-antallPerioder)) {
    linjer.push(
      `| ${kort(p.fra)}–${kort(p.til).slice(6)}${p.rolig ? ' (rolig)' : ''} | ${p.kallPerTime} | ${prosent(p.automatisertAndel)} | ${prosent(p.feilAndel)} | ${p.tidsavbrudd} | ` +
        `${p.swapMBPerS} | ${p.sidefeilPerS} | ${p.iops} | ${p.tempMBPerTime} | ${tall(p.funksjoner[f1 as string]?.p95Ms ?? null, ' ms')} | ${tall(p.funksjoner[f2 as string]?.p95Ms ?? null, ' ms')} | ${p.databaseMB} |`,
    )
  }
  return linjer.join('\n')
}

/** Leser historikken (én måling per linje) og hopper over tomme og ødelagte linjer. */
export function lesHistorikk(tekst: string): Maling[] {
  return tekst
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((l) => {
      try {
        const m = JSON.parse(l) as Maling
        return m && m.versjon === 1 ? [m] : []
      } catch {
        return []
      }
    })
}
