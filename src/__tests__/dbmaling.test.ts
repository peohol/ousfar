import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  beregningsstorrelse,
  faser,
  fraMetrikker,
  lesHistorikk,
  lesMetrikker,
  perioder,
  rapport,
  ROLIG_KALL_PER_TIME,
  type Maling,
} from '../drift/dbmaling'

const PROMETHEUS = `# HELP node_vmstat_pswpin x
node_boot_time_seconds{service_type="db"} 1.7938e+09
node_memory_MemTotal_bytes{service_type="db"} 4.52907008e+08
node_memory_MemAvailable_bytes{service_type="db"} 1.46e+08
node_memory_SwapTotal_bytes{service_type="db"} 1.0e+09
node_memory_SwapFree_bytes{service_type="db"} 6.0e+08
node_vmstat_pswpin{service_type="db"} 1000
node_vmstat_pswpout{service_type="db"} 2000
node_vmstat_pgmajfault{service_type="db"} 300
node_disk_reads_completed_total{device="nvme0n1"} 100
node_disk_reads_completed_total{device="nvme1n1"} 50
node_disk_reads_completed_total{device="loop0"} 99999
node_disk_writes_completed_total{device="nvme0n1"} 10
node_disk_writes_completed_total{device="nvme1n1"} 5
node_disk_read_bytes_total{device="nvme0n1"} 2e6
node_disk_written_bytes_total{device="nvme0n1"} 1e6
pg_stat_database_temp_bytes_total{server="localhost:5432"} 5e7
pg_stat_database_temp_files_total{server="localhost:5432"} 7
`

/** En syntetisk måling; tellerne og trafikken overstyres per test. */
function maling(tid: string, over: Omit<Partial<Maling>, 'teller'> & { teller?: Partial<Maling['teller']> } = {}): Maling {
  const { teller, ...rest } = over
  return {
    versjon: 1,
    tid,
    oppstart: '2026-11-05T09:38:00.000Z',
    kapasitet: { beregning: 'nano', minneMB: 453 },
    sistMigrering: '20261103093000',
    databaseMB: 534,
    minne: { ledigMB: 100, swapBruktMB: 500 },
    teller: { swapInnSider: 0, swapUtSider: 0, storeSidefeil: 0, diskOperasjoner: 0, diskMB: 0, tempMB: 0, tempFiler: 0, ...teller },
    statistikkFra: '2026-11-05T09:38:50Z',
    funksjoner: {},
    trafikk: { fra: tid, til: tid, kall: 0, feil5xx: 0, automatisert: 0, tidsavbrudd: 0, rpc: {} },
    ...rest,
  }
}

const trafikk = (kall: number, ekstra: Partial<Maling['trafikk']> = {}): Maling['trafikk'] => ({
  fra: '',
  til: '',
  kall,
  feil5xx: 0,
  automatisert: 0,
  tidsavbrudd: 0,
  rpc: {},
  ...ekstra,
})

describe('maskinens metrikker', () => {
  it('summerer diskene og hopper over loop-disker og kommentarer', () => {
    const m = lesMetrikker(PROMETHEUS)
    expect(m.get('node_disk_reads_completed_total')).toBe(150)
    expect(m.has('# HELP')).toBe(false)
  })

  it('gjør metrikkene om til et øyeblikksbilde', () => {
    const b = fraMetrikker(lesMetrikker(PROMETHEUS))
    expect(b.oppstart).toBe(new Date(1.7938e12).toISOString())
    expect(b.minneMB).toBe(453)
    expect(b.minne).toEqual({ ledigMB: 146, swapBruktMB: 400 })
    expect(b.teller).toEqual({ swapInnSider: 1000, swapUtSider: 2000, storeSidefeil: 300, diskOperasjoner: 165, diskMB: 3, tempMB: 50, tempFiler: 7 })
  })

  it('stopper med en tydelig feil når en metrikk mangler', () => {
    expect(() => fraMetrikker(lesMetrikker('node_load1 0.1'))).toThrow(/node_boot_time_seconds mangler/)
  })
})

describe('kapasiteten', () => {
  it('er nano uten tillegg og ellers navnet på tillegget', () => {
    expect(beregningsstorrelse({ selected_addons: [] })).toBe('nano')
    expect(beregningsstorrelse(null)).toBe('nano')
    expect(beregningsstorrelse({ selected_addons: [{ type: 'custom_domain', variant: { id: 'cd_default' } }, { type: 'compute_instance', variant: { id: 'ci_micro' } }] })).toBe('micro')
  })
})

describe('perioder mellom målingene', () => {
  const a = maling('2026-11-06T12:00:00.000Z', {
    teller: { swapInnSider: 1000, swapUtSider: 1000, storeSidefeil: 100, diskOperasjoner: 10_000, diskMB: 100, tempMB: 10 },
    funksjoner: { les_stoff: { kall: 10, totalMs: 20_000, tempBlokker: 1000 } },
  })
  const b = maling('2026-11-06T15:00:00.000Z', {
    teller: { swapInnSider: 1000 + 10_800, swapUtSider: 1000 + 21_600, storeSidefeil: 100 + 5400, diskOperasjoner: 10_000 + 1_080_000, diskMB: 100 + 1080, tempMB: 10 + 300 },
    funksjoner: { les_stoff: { kall: 30, totalMs: 60_000, tempBlokker: 1000 + 20 * 1500 } },
    trafikk: trafikk(600, { feil5xx: 6, automatisert: 300, tidsavbrudd: 2, rpc: { les_stoff: { kall: 20, feil5xx: 1, p50Ms: 900, p95Ms: 2500 } } }),
  })

  it('regner rater per sekund og time', () => {
    const [p] = perioder([b, a])
    expect(p).toMatchObject({
      fra: a.tid,
      til: b.tid,
      timer: 3,
      rolig: false,
      kallPerTime: 200,
      automatisertAndel: 0.5,
      feilAndel: 0.01,
      tidsavbrudd: 2,
      swapInnPerS: 1,
      swapUtPerS: 2,
      sidefeilPerS: 0.5,
      iops: 100,
      diskMBPerS: 0.1,
      tempMBPerTime: 100,
    })
    // (10 800 + 21 600) sider à 4 kB over 10 800 s.
    expect(p?.swapMBPerS).toBe(0.01)
    expect(p?.funksjoner.les_stoff).toEqual({ kall: 20, snittMs: 2000, tempMBPerKall: 12.3, p95Ms: 2500, feilAndel: 0.05 })
    expect(p?.funksjoner.les_stoffer).toEqual({ kall: 0, snittMs: null, tempMBPerKall: null, p95Ms: null, feilAndel: null })
  })

  it('regner kall i timen over trafikkvinduets egen lengde', () => {
    const vindu = trafikk(100, { fra: '2026-11-06T11:50:00.000Z', til: '2026-11-06T12:50:00.000Z' })
    const [p] = perioder([a, maling('2026-11-06T15:00:00.000Z', { teller: b.teller, trafikk: vindu })])
    expect(p?.kallPerTime).toBe(100)
    expect(p?.rolig).toBe(false)
  })

  it('hopper over et par der maskinen har startet på nytt', () => {
    expect(perioder([a, { ...b, oppstart: '2026-11-06T14:00:00.000Z' }])).toEqual([])
  })

  it('bruker ikke funksjonstellerne når statistikken er nullstilt mellom målingene', () => {
    const [p] = perioder([a, { ...b, statistikkFra: '2026-11-06T14:00:00Z' }])
    expect(p?.funksjoner.les_stoff?.kall).toBe(0)
    expect(p?.funksjoner.les_stoff?.snittMs).toBeNull()
    // Svartiden i API-et kommer fra loggene og gjelder fortsatt.
    expect(p?.funksjoner.les_stoff?.p95Ms).toBe(2500)
  })

  it('hopper over en periode der kapasiteten eller migreringen har endret seg', () => {
    expect(perioder([a, { ...b, sistMigrering: '20261107000000' }])).toEqual([])
    expect(perioder([a, { ...b, kapasitet: { beregning: 'micro', minneMB: 1000 } }])).toEqual([])
  })

  it('regner en periode som rolig bare under grensen', () => {
    const start = maling('2026-11-06T00:00:00.000Z')
    const rett = (kall: number) => perioder([start, maling('2026-11-06T01:00:00.000Z', { trafikk: trafikk(kall) })])[0]?.rolig
    expect(rett(ROLIG_KALL_PER_TIME - 1)).toBe(true)
    expect(rett(ROLIG_KALL_PER_TIME)).toBe(false)
  })
})

describe('faser', () => {
  it('skiller kapasitet og migrering og snitter rolig drift for seg', () => {
    const t = (h: number) => `2026-11-06T${String(h).padStart(2, '0')}:00:00.000Z`
    const nano = (h: number, swap: number, kall: number) => maling(t(h), { teller: { swapInnSider: swap, diskOperasjoner: swap }, trafikk: trafikk(kall) })
    const micro = (h: number, swap: number, kall: number) => ({
      ...nano(h, swap, kall),
      oppstart: '2026-11-06T05:00:00.000Z',
      kapasitet: { beregning: 'micro', minneMB: 1000 },
    })
    const liste = [nano(0, 0, 0), nano(1, 3600 * 100, 10), nano(2, 3600 * 300, 1000), micro(6, 0, 0), micro(7, 3600, 10)]
    const [f1, f2] = faser(perioder(liste))
    expect(f1?.fase).toBe('nano · migrering 20261103093000')
    expect(f1?.perioder).toBe(2)
    // Bare den rolige timen (100 sider/s) teller i snittet for rolig drift.
    expect(f1?.rolig?.iops).toBe(100)
    expect(f1?.alle.iops).toBe(150)
    expect(f2?.fase).toBe('micro · migrering 20261103093000')
    expect(f2?.rolig?.iops).toBe(1)
  })
})

describe('andelene i en fase', () => {
  it('regnes av summen av kall, ikke som snitt av periodene', () => {
    const t = (h: number) => `2026-11-06T${String(h).padStart(2, '0')}:00:00.000Z`
    const liste = [
      maling(t(0)),
      maling(t(1), { trafikk: trafikk(1, { automatisert: 1, feil5xx: 1 }) }),
      maling(t(2), { trafikk: trafikk(999) }),
    ]
    const [f] = faser(perioder(liste))
    expect(f?.alle.automatisertAndel).toBe(0.001)
    expect(f?.alle.feilAndel).toBe(0.001)
  })
})

describe('rapporten og historikken', () => {
  it('sier fra når det er for få målinger', () => {
    expect(rapport([maling('2026-11-06T12:00:00.000Z')])).toMatch(/For få målinger/)
  })

  it('viser fasene og de siste periodene', () => {
    const tekst = rapport([maling('2026-11-06T12:00:00.000Z'), maling('2026-11-06T15:00:00.000Z', { trafikk: trafikk(30) })])
    expect(tekst).toMatch(/### Faser/)
    expect(tekst).toMatch(/\| nano · migrering 20261103093000 \|/)
    expect(tekst).toMatch(/11-06 12:00–15:00 \(rolig\)/)
  })

  it('hopper over tomme, ødelagte og ukjente linjer', () => {
    const m = maling('2026-11-06T12:00:00.000Z')
    expect(lesHistorikk(`${JSON.stringify(m)}\n\n{ødelagt\n${JSON.stringify({ versjon: 2 })}\n`)).toEqual([m])
  })
})

describe('arbeidsflyten', () => {
  const flyt = readFileSync(new URL('../../.github/workflows/db-maling.yml', import.meta.url), 'utf8')

  it('måler hver tredje time og for hånd, bare fra main, og lagrer historikken uten å pushe noe', () => {
    expect(flyt).toMatch(/schedule:\n\s+- cron: '50 \*\/3 \* \* \*'\n\s+workflow_dispatch:/)
    expect(flyt).toContain("if: github.ref == 'refs/heads/main'")
    expect(flyt).toContain('permissions: {}')
    expect(flyt).toContain('environment: produksjon')
    // Historikken er et artefakt i kjøringen: ingen push, så verken CI eller Vercel starter av målingene.
    expect(flyt).not.toMatch(/git (push|commit|clone)|contents: write/)
    expect(flyt).toMatch(/permissions:\n\s+contents: read\n(\s+#.*\n)?\s+actions: read/)
    expect(flyt).toContain('gh run download "$forrige"')
    expect(flyt).toMatch(/actions\/upload-artifact@[0-9a-f]{40} # v/)
    expect(flyt).toContain('ARTEFAKT: db-malinger')
    expect(flyt).not.toMatch(/SUPABASE_SECRET_KEY|SUPABASE_DB_PASSWORD|db push|apply_migration/)
    for (const linje of flyt.split('\n').filter((l) => /^\s*- uses: /.test(l))) expect(linje, linje).toMatch(/@[0-9a-f]{40} # v/)
    // Uttrykk står bare som verdien til en nøkkel (som `env`), aldri inne i et skript.
    for (const linje of flyt.split('\n').filter((l) => l.includes('${{'))) expect(linje, linje).toMatch(/^\s*(?!run:)[A-Za-z_-]+:\s/)
    // Tilgangstokenet er bare med i steget som måler, etter at avhengighetene er installert.
    expect(flyt.match(/secrets\.SUPABASE_ACCESS_TOKEN/g)).toHaveLength(1)
    expect(flyt.indexOf('secrets.SUPABASE_ACCESS_TOKEN')).toBeGreaterThan(flyt.indexOf('npm ci --ignore-scripts'))
  })
})
