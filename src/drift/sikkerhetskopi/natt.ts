/**
 * Nattens kopi fra start til slutt, slik GitHub-jobben kjører den
 * (`.github/workflows/sikkerhetskopi.yml`, `docs/drift-gjenoppretting.md`,
 * «Kopiene i drift»). Avhengighetene gis inn, så hele løpet kan prøves med
 * et falskt lager og en lokal database.
 *
 * 1. Lageret leses: den nyeste hele kopien og bitene den har. Låsen på den
 *    forlenges før noe annet, så den siste gode kopien aldri går ut mens
 *    kopieringen feiler.
 * 2. Kopien tas i ett øyeblikksbilde; bare bitene lageret ikke har, hentes.
 * 3. Bitene, kopien og til sist signaturen legges inn med lås.
 * 4. Kopien kontrolleres på nytt i lageret: hel, låst og lik det som ble sendt.
 * 5. Først da ryddes det som er utløpt, og forbruket regnes ut.
 *
 * Feiler et steg før 4, er det ingen ny kopi, og ingenting ryddes.
 */
import { mkdtempSync, rmSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import { Stopp } from './feil'
import { summerAv, taKopi, type TaValg } from './kopi'
import { bekreftKopi, forbruk, forlengLas, lasTil, leggInnKopi, lesLageret, oppryddingsplan, rydd, sisteHele, type Forbruk } from './lager'
import { offentligNokkel } from './signatur'
import type { S3 } from './s3'

const logg = (tekst: string) => console.log(`[nattens kopi] ${tekst}`)
const mb = (b: number) => `${(b / 1000 ** 2).toFixed(1)} MB`

/** De offentlige age-nøklene kopiene krypteres til; en privat nøkkel her stopper jobben. */
export function lesMottakere(tekst: string): string[] {
  const mottakere = tekst.split(/[\s,]+/).filter(Boolean)
  if (!mottakere.length) throw new Stopp('KOPI_MOTTAKERE har ingen offentlige age-nøkler.')
  for (const m of mottakere) if (!/^age1[02-9ac-hj-np-z]{58}$/.test(m)) throw new Stopp('KOPI_MOTTAKERE skal bare ha offentlige age-nøkler (age1…). En privat nøkkel skal aldri ligge hos jobben.')
  return mottakere
}

export interface NattValg extends Omit<TaValg, 'ut' | 'kjente' | 'kontrollnokkel'> {
  s3: S3
  naa?: () => Date
}

export interface Nattrapport {
  kopi: string
  laget: string
  biter: number
  nye: number
  /** Byte hentet ut av Supabase. */
  hentet: number
  /** Byte lagt inn i lageret. */
  sendt: number
  forsok: number
  /** Lageret hadde ingen hel kopi, så alt ble hentet; trafikken regnes ikke opp til en måned. */
  forste: boolean
  forlenget: number
  rydding: { slettet: number; last: number; bytes: number; stopp?: string; ukjente: number }
  forbruk: Forbruk
}

export async function kjorNatt(valg: NattValg): Promise<Nattrapport> {
  const naa = valg.naa ?? (() => new Date())
  const offentlig = offentligNokkel(valg.signeringsnokkel)
  const forHand = await lesLageret(valg.s3, offentlig)
  const { kopi: forrige, kjente } = sisteHele(forHand)
  let forlenget = 0
  if (forrige) {
    forlenget = await forlengLas(valg.s3, [...forrige.filer, forrige.sigVersjon], lasTil(naa()))
    logg(`nyeste hele kopi i lageret: ${forrige.signatur.fil} (${kjente.size} biter); låsen forlenget på ${forlenget} filer`)
  } else logg('lageret har ingen hel kopi; alle bitene hentes')

  const ut = mkdtempSync(join(tmpdir(), 'ousfar-natt-'))
  chmodSync(ut, 0o700)
  try {
    const k = await taKopi({ ...valg, ut, kjente })
    const summer = await summerAv(k.fil)
    const laget = k.laget
    await leggInnKopi(valg.s3, { fil: k.fil, ut, laget, deler: k.deler, nye: k.nye, ...summer }, forHand, summerAv)
    const sendt = summer.bytes + k.deler.filter((d) => k.nye.includes(d.identitet)).reduce((s, d) => s + d.bytes, 0)
    const b = await bekreftKopi(valg.s3, offentlig, k.fil, k.nye, lasTil(laget), summerAv)
    if (!b.hel) throw new Stopp(`Kopien ${basename(k.fil)} er ikke hel i lageret: ${b.avvik.join('; ')}`)
    logg(`kopien er hel i lageret: ${b.filer} filer låst, ${b.hentetTilbake} hentet tilbake og like`)

    const etter = await lesLageret(valg.s3, offentlig)
    const plan = oppryddingsplan(etter, naa())
    const ryddet = plan.stopp ? { slettet: 0, last: 0, bytes: 0 } : await rydd(valg.s3, plan)
    logg(plan.stopp ?? `ryddet ${ryddet.slettet} filer (${ryddet.last} fortsatt låst)`)
    const igjen = await valg.s3.versjoner()
    return {
      kopi: basename(k.fil),
      laget,
      biter: k.deler.length,
      nye: k.nye.length,
      hentet: k.hentet,
      sendt,
      forsok: k.forsok,
      forste: !forrige,
      forlenget,
      rydding: { ...ryddet, stopp: plan.stopp, ukjente: plan.ukjente.length },
      forbruk: forbruk(igjen, forrige ? k.hentet : 0),
    }
  } finally {
    rmSync(ut, { recursive: true, force: true })
  }
}

/**
 * Rapporten for oppsummeringen av jobben i GitHub: bare tall og filnavn,
 * aldri innhold eller nøkler.
 */
export function rapporttekst(r: Nattrapport): string {
  const linjer = [
    `## Nattens kopi: ${r.kopi}`,
    '',
    `- Laget ${r.laget}${r.forsok > 1 ? ` (forsøk ${r.forsok})` : ''}, hel og kontrollert i lageret.`,
    `- ${r.biter} biter, ${r.nye} nye. Hentet fra Supabase: ${mb(r.hentet)}. Lagt i lageret: ${mb(r.sendt)}.`,
    r.forste ? '- Den første hele kopien i lageret: alle bitene ble hentet.' : `- Låsen forlenget på ${r.forlenget} filer i forrige kopi.`,
    r.rydding.stopp ? `- Ikke ryddet: ${r.rydding.stopp}` : `- Ryddet ${r.rydding.slettet} filer (${mb(r.rydding.bytes)}); ${r.rydding.last} fortsatt låst.`,
    ...(r.rydding.ukjente ? [`- ${r.rydding.ukjente} filer utenfor kopienes mapper er ikke rørt.`] : []),
    `- Lageret: ${r.forbruk.filer} filer, ${mb(r.forbruk.lagerBytes)}.${r.forste ? '' : ` Kopienes trafikk regnet til en måned: ${mb(r.forbruk.trafikkManed)}.`}`,
  ]
  if (r.forbruk.varsler.length) linjer.push('', '### Varsler', '', ...r.forbruk.varsler.map((v) => `- ${v}`))
  return `${linjer.join('\n')}\n`
}
