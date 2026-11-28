/**
 * Nøkkelbyttet for kopilageret (`.github/workflows/lagernokkel.yml`,
 * `docs/drift-gjenoppretting.md`, «Nøkkelen til lageret»). Nettsiden til
 * Backblaze kan ikke lage en nøkkel uten `bypassGovernance`,
 * `writeBucketRetentions` og `writeBuckets`, og nøkkeleieren bruker ingen
 * terminal. Derfor lager GitHub-jobben nøkkelen selv:
 *
 * 1. Med en midlertidig nøkkel som kan lage nøkler (hovednøkkelen), lagt i
 *    miljøet `backup` av nøkkeleieren, lages en nøkkel som bare gjelder
 *    kopibøtta, med nøyaktig `RETTIGHETER.ny`.
 * 2. Den nye nøkkelen kontrolleres med den samme kontrollen kopijobben gjør
 *    (`kontrollerNokkel`); bestås den ikke, slettes den igjen.
 * 3. Den legges rett i miljøet som `B2_KEY_ID` og `B2_APPLICATION_KEY`,
 *    forseglet til miljøets nøkkel (`forsegling.ts`). Den vises aldri.
 * 4. Den gamle nøkkelen og eldre nøkler fra byttet slettes i Backblaze.
 * 5. Uansett utfall slettes de midlertidige hemmelighetene i miljøet, den
 *    midlertidige nøkkelen i Backblaze (er den ikke hovednøkkelen) og
 *    GitHub-tokenet trekkes tilbake.
 *
 * Alt jobben skriver, er faste tekster og tall (`logg.ts`).
 */
import { OffentligStopp } from './feil'
import { forsegl } from './forsegling'
import { kontrollerNokkel } from './lager'
import { feiltekst, lagLogg, masker, settTrinn } from './logg'
import { LAGER, NOKKELBYTTE, RETTIGHETER } from './drift'

export interface Bytteoppsett {
  /** Den midlertidige nøkkelen som kan lage nøkler (`writeKeys`, `listKeys`, `deleteKeys`, `listBuckets`). */
  oppsett: { id: string; nokkel: string }
  /** ID-en til nøkkelen kopijobben har nå, som skal slettes etter byttet. */
  gammelId?: string
  /** Et token som kan skrive og slette hemmelighetene i miljøet; trekkes tilbake etterpå. */
  github: { token: string; repo: string }
  b2Adresse?: string
  githubAdresse?: string
  naa?: Date
  /** Venting mellom forsøkene når Backblaze ennå ikke kjenner den nye nøkkelen. */
  vent?: (ms: number) => Promise<void>
}

export interface Bytteresultat {
  /** Hvorfor byttet stoppet (fast tekst), eller `null` når den nye nøkkelen er i bruk. */
  stopp: string | null
  nyId: string
  slettedeNokler: number
  midlertidigeSlettet: string[]
  oppsettsnokkel: 'slettet' | 'hovednøkkel' | 'ikke slettet'
  tokenTrukketTilbake: boolean
  funn: string[]
}

const logg = lagLogg('nøkkelbytte')
const sov = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms))

interface B2Konto {
  kontoId: string
  apiUrl: string
  token: string
  rettigheter: string[]
}

/** Et kall til Backblazes eget API; en feil gir bare kallet og statusen. */
async function b2<T>(konto: B2Konto, kall: string, kropp: Record<string, unknown>): Promise<T> {
  const svar = await fetch(`${konto.apiUrl}/b2api/v3/${kall}`, {
    method: 'POST',
    headers: { authorization: konto.token, 'content-type': 'application/json' },
    body: JSON.stringify(kropp),
  }).catch(() => {
    throw new OffentligStopp(`Backblaze svarer ikke (${kall}).`)
  })
  if (!svar.ok) throw new OffentligStopp(`Backblaze svarte ${svar.status} på ${kall}.`)
  return (await svar.json()) as T
}

async function loggInn(id: string, nokkel: string, adresse: string): Promise<B2Konto> {
  const svar = await fetch(`${adresse}/b2api/v3/b2_authorize_account`, {
    headers: { authorization: `Basic ${Buffer.from(`${id}:${nokkel}`).toString('base64')}` },
  }).catch(() => {
    throw new OffentligStopp('Backblaze svarer ikke (b2_authorize_account).')
  })
  if (!svar.ok) throw new OffentligStopp(`Backblaze godtok ikke den midlertidige nøkkelen (${svar.status}). Sjekk at keyID og nøkkelen er limt inn riktig.`)
  const k = (await svar.json()) as { accountId: string; authorizationToken: string; apiInfo: { storageApi: { apiUrl: string; allowed?: { capabilities?: string[] } } } }
  return { kontoId: k.accountId, apiUrl: k.apiInfo.storageApi.apiUrl, token: k.authorizationToken, rettigheter: k.apiInfo.storageApi.allowed?.capabilities ?? [] }
}

/** Hemmelighetene i miljøet `backup` med GitHubs API. */
function githubMiljo(g: Bytteoppsett['github'], adresse: string) {
  const sti = `${adresse}/repos/${g.repo}/environments/${encodeURIComponent(NOKKELBYTTE.miljo)}/secrets`
  const kall = (metode: string, del: string, kropp?: unknown) =>
    fetch(`${sti}/${del}`, {
      method: metode,
      headers: {
        authorization: `Bearer ${g.token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'ousfar-nokkelbytte',
        ...(kropp ? { 'content-type': 'application/json' } : {}),
      },
      body: kropp ? JSON.stringify(kropp) : undefined,
    }).catch(() => {
      throw new OffentligStopp(`GitHub svarer ikke (${metode} ${del}).`)
    })
  return {
    async offentligNokkel(): Promise<{ id: string; nokkel: Uint8Array }> {
      const svar = await kall('GET', 'public-key')
      if (!svar.ok) throw new OffentligStopp(`GitHub godtok ikke tokenet for miljøet ${NOKKELBYTTE.miljo} (${svar.status}). Tokenet må gjelde ousfar og kunne skrive hemmeligheter i miljøer.`)
      const k = (await svar.json()) as { key_id: string; key: string }
      return { id: k.key_id, nokkel: new Uint8Array(Buffer.from(k.key, 'base64')) }
    },
    async skriv(navn: string, verdi: string, mottaker: { id: string; nokkel: Uint8Array }): Promise<void> {
      const boks = forsegl(new TextEncoder().encode(verdi), mottaker.nokkel)
      const svar = await kall('PUT', navn, { encrypted_value: Buffer.from(boks).toString('base64'), key_id: mottaker.id })
      if (!svar.ok) throw new OffentligStopp(`GitHub lagret ikke ${navn} (${svar.status}).`)
    },
    /** Sletter hemmeligheten; `true` også når den ikke fantes. */
    async slett(navn: string): Promise<boolean> {
      const svar = await kall('DELETE', navn)
      return svar.ok || svar.status === 404
    },
  }
}

/** Trekker tokenet tilbake hos GitHub (uten innlogging, slik GitHub krever for dette kallet). */
async function trekkTilbake(token: string, adresse: string): Promise<boolean> {
  const svar = await fetch(`${adresse}/credentials/revoke`, {
    method: 'POST',
    headers: { accept: 'application/vnd.github+json', 'content-type': 'application/json', 'user-agent': 'ousfar-nokkelbytte' },
    body: JSON.stringify({ credentials: [token] }),
  }).catch(() => null)
  return svar?.status === 202
}

/** Byttet; se fila. Ryddingen gjøres også når byttet stopper, og resultatet sier hva som ble gjort. */
export async function byttNokkel(valg: Bytteoppsett): Promise<Bytteresultat> {
  const b2Adresse = valg.b2Adresse ?? 'https://api.backblazeb2.com'
  const githubAdresse = valg.githubAdresse ?? 'https://api.github.com'
  const vent = valg.vent ?? sov
  const naa = valg.naa ?? new Date()
  const github = githubMiljo(valg.github, githubAdresse)
  const r: Bytteresultat = { stopp: null, nyId: '', slettedeNokler: 0, midlertidigeSlettet: [], oppsettsnokkel: 'ikke slettet', tokenTrukketTilbake: false, funn: [] }
  let konto: B2Konto | null = null

  async function bytt(): Promise<void> {
    settTrinn('den midlertidige nøkkelen')
    const k = (konto = await loggInn(valg.oppsett.id, valg.oppsett.nokkel, b2Adresse))
    const mangler = ['writeKeys', 'listKeys', 'deleteKeys', 'listBuckets'].filter((x) => !k.rettigheter.includes(x))
    if (mangler.length) throw new OffentligStopp(`Den midlertidige nøkkelen kan ikke lage og slette nøkler (mangler ${mangler.join(', ')}). Bruk hovednøkkelen (Master Application Key).`)

    settTrinn('bøtta')
    const { buckets } = await b2<{ buckets: { bucketId: string; bucketName: string; fileLockConfiguration?: { value?: { isFileLockEnabled?: boolean } | null } }[] }>(k, 'b2_list_buckets', {
      accountId: k.kontoId,
      bucketName: LAGER.bucket,
    })
    const botte = buckets.find((b) => b.bucketName === LAGER.bucket)
    if (!botte) throw new OffentligStopp(`Fant ikke bøtta ${LAGER.bucket}.`)
    if (botte.fileLockConfiguration?.value?.isFileLockEnabled === false) throw new OffentligStopp(`Bøtta ${LAGER.bucket} har ikke Object Lock.`)

    // Før nøkkelen lages: et token som ikke virker, skal ikke etterlate en nøkkel ingen har.
    settTrinn('miljøet i GitHub')
    const mottaker = await github.offentligNokkel()

    settTrinn('den nye nøkkelen')
    const navn = `${NOKKELBYTTE.navnPrefiks}${naa.toISOString().slice(0, 16).replace(/\D/g, '')}`
    const ny = await b2<{ applicationKeyId: string; applicationKey: string }>(k, 'b2_create_key', {
      accountId: k.kontoId,
      keyName: navn,
      bucketId: botte.bucketId,
      capabilities: [...RETTIGHETER.ny],
    })
    masker(ny.applicationKey)
    logg(`Ny nøkkel ${navn} laget for ${LAGER.bucket}.`)

    settTrinn('kontrollen av den nye nøkkelen')
    try {
      for (let forsok = 1; ; forsok++) {
        try {
          await kontrollerNokkel(ny.applicationKeyId, ny.applicationKey, `${b2Adresse}/b2api/v4/b2_authorize_account`)
          break
        } catch (e) {
          // En ny nøkkel kan bruke noen sekunder på å bli kjent; bare innloggingen prøves igjen.
          if (forsok >= 5 || !/godtok ikke nøkkelen/.test((e as Error).message)) throw e
          await vent(3000 * forsok)
        }
      }
    } catch (e) {
      await b2(k, 'b2_delete_key', { applicationKeyId: ny.applicationKeyId }).catch(() => r.funn.push(`Nøkkelen ${navn} besto ikke kontrollen og kunne ikke slettes; slett den i Backblaze.`))
      throw e
    }
    logg('Den nye nøkkelen besto kontrollen: bare kopibøtta, rettighetene jobben trenger og ingen den aldri skal ha.')

    settTrinn('hemmelighetene i GitHub')
    await github.skriv(NOKKELBYTTE.hemmeligheter.nokkel, ny.applicationKey, mottaker)
    await github.skriv(NOKKELBYTTE.hemmeligheter.id, ny.applicationKeyId, mottaker)
    r.nyId = ny.applicationKeyId
    logg(`${NOKKELBYTTE.hemmeligheter.id} og ${NOKKELBYTTE.hemmeligheter.nokkel} er byttet i miljøet ${NOKKELBYTTE.miljo}.`)

    settTrinn('de gamle nøklene')
    const { keys } = await b2<{ keys: { applicationKeyId: string; keyName: string; bucketId?: string | null; bucketIds?: string[] | null }[] }>(k, 'b2_list_keys', {
      accountId: k.kontoId,
      maxKeyCount: 1000,
    })
    // Bare nøkler som gjelder kopibøtta alene, og som er den gamle eller fra et tidligere bytte, slettes.
    const bareKopibotta = (n: (typeof keys)[number]) => {
      const botter = [n.bucketId, ...(n.bucketIds ?? [])].filter(Boolean)
      return botter.length > 0 && botter.every((b) => b === botte.bucketId)
    }
    const gamle = keys.filter(
      (n) =>
        n.applicationKeyId !== ny.applicationKeyId &&
        n.applicationKeyId !== valg.oppsett.id &&
        (n.applicationKeyId === valg.gammelId || n.keyName.startsWith(NOKKELBYTTE.navnPrefiks)) &&
        bareKopibotta(n),
    )
    for (const n of gamle) {
      await b2(k, 'b2_delete_key', { applicationKeyId: n.applicationKeyId })
      r.slettedeNokler++
    }
    if (valg.gammelId && !gamle.some((n) => n.applicationKeyId === valg.gammelId)) r.funn.push('Den gamle nøkkelen ble ikke funnet som en nøkkel for kopibøtta alene, og ble ikke slettet.')
  }

  /** De midlertidige hemmelighetene er bare til ett bytte: de fjernes uansett utfall. */
  async function rydd(): Promise<void> {
    settTrinn('ryddingen')
    for (const navn of Object.values(NOKKELBYTTE.midlertidige)) {
      if (await github.slett(navn).catch(() => false)) r.midlertidigeSlettet.push(navn)
      else r.funn.push(`${navn} kunne ikke slettes i miljøet ${NOKKELBYTTE.miljo}; slett den i GitHub.`)
    }
    if (konto && valg.oppsett.id === konto.kontoId) r.oppsettsnokkel = 'hovednøkkel'
    else if (konto) {
      const slettet = await b2(konto, 'b2_delete_key', { applicationKeyId: valg.oppsett.id }).then(
        () => true,
        () => false,
      )
      r.oppsettsnokkel = slettet ? 'slettet' : 'ikke slettet'
    }
    r.tokenTrukketTilbake = await trekkTilbake(valg.github.token, githubAdresse)
  }

  try {
    await bytt()
  } catch (e) {
    r.stopp = e instanceof OffentligStopp ? e.message : `Nøkkelbyttet stoppet (${feiltekst(e)}).`
  }
  await rydd()
  return r
}

/** Oppsummeringen til GitHub: hva som ble gjort, og hva som eventuelt står igjen for nøkkeleieren. */
export function bytterapport(r: Bytteresultat): string {
  const oppsett = {
    slettet: 'Den midlertidige nøkkelen er slettet i Backblaze.',
    hovednøkkel: 'Den midlertidige nøkkelen var hovednøkkelen, som ikke kan slettes. Lag en ny hovednøkkel i Backblaze, så slutter den som lå i GitHub, å virke.',
    'ikke slettet': 'Den midlertidige nøkkelen ble ikke slettet i Backblaze; slett den der.',
  }[r.oppsettsnokkel]
  return [
    '## Nøkkelbyttet for kopilageret',
    '',
    r.nyId
      ? `- Kopijobben har en ny nøkkel som bare gjelder ${LAGER.bucket}, med nøyaktig rettighetene den trenger (${RETTIGHETER.ny.join(', ')}).`
      : '- Kopijobben har ikke fått en ny nøkkel; den gamle er urørt.',
    ...(r.stopp ? [`- Stoppet: ${r.stopp}`] : []),
    `- ${r.slettedeNokler} gamle nøkler slettet i Backblaze.`,
    `- Midlertidige hemmeligheter slettet i miljøet ${NOKKELBYTTE.miljo}: ${r.midlertidigeSlettet.join(', ') || 'ingen'}.`,
    `- ${oppsett}`,
    `- ${r.tokenTrukketTilbake ? 'GitHub-tokenet er trukket tilbake.' : 'GitHub-tokenet ble ikke trukket tilbake; slett det i GitHub (Settings, Developer settings, Personal access tokens).'}`,
    ...r.funn.map((f) => `- ${f}`),
  ].join('\n')
}
