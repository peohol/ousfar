/**
 * Kontrollen «Prosjektansvar» (`docs/prosjektansvar.md` §6): hver PR har ett
 * prosjekt og én ansvarlig systemarkitekt, og de samme står på Issue-et med
 * arbeidsoppgaven.
 *
 * - Prosjektet er nøyaktig én prosjektetikett (`ansvar:dev`, `ansvar:fag` eller
 *   `ansvar:verktoy`). Den avgjør hvilket ChatGPT-prosjekt som kontrollerer.
 * - Personen er nøyaktig én assignee, en av systemarkitektene. Den avgjør
 *   hvem sitt ChatGPT-prosjekt det er. PR-forfatteren, grennavnet og navn i
 *   fritekst teller ikke.
 * - Arbeidsoppgaven er Issue-et PR-en viser til under «## Arbeidsoppgave».
 *   Det skal ha den samme prosjektetiketten og den samme ene assignee-en.
 *
 * Kontrollen ser bare på merkingen, ikke på om den er riktig: det vurderer den
 * som kontrollerer PR-en. Prosjektene og systemarkitektene står i
 * `.github/prosjektansvar.json`. Kravene om ansvarlig og arbeidsoppgave gjelder
 * PR-er som er opprettet etter at den fila kom på standardgrenen; eldre PR-er
 * får bare en advarsel, så de kan fullføres slik de ble startet. Fila må derfor
 * ikke flyttes.
 *
 * **Betrodd kjøring.** Den påkrevde kontrollen kjøres av
 * `.github/workflows/prosjektansvar.yml`, alltid fra standardgrenen (hendelsene
 * `workflow_run` og `issues`), og sjekker aldri ut eller kjører kode fra PR-en.
 * PR-en og Issue-ene hentes som data fra GitHub. Resultatet skrives på PR-ens
 * siste commit som en commit-status med navnet «Prosjektansvar», som er den
 * regelsettet på `main` krever, og som en check run med samme navn og hele
 * forklaringen. (GitHub teller ikke check runs som en arbeidsflyt lager
 * gjennom Checks-API-et, som påkrevde sjekker; en commit-status fra den samme
 * arbeidsflyten teller.) En PR som endrer skriptet, regelfila eller
 * arbeidsflytene, vurderes derfor med versjonen på `main`; endringen virker
 * først når den er slått sammen.
 *
 * - `workflow_run`: «Prosjektansvar – utløser» (som kjører ved hver endring
 *   av en PR, uten tilganger og uten å kjøre noe) er ferdig. Vurderer PR-ene
 *   med den commiten.
 * - `issues`: et Issue har fått ny ansvarlig eller etikett, eller er slettet
 *   eller flyttet. Vurderer på nytt alle åpne PR-er som viser til det, så en
 *   grønn kontroll aldri blir stående på et foreldet grunnlag.
 *
 * Vanlig JavaScript uten avhengigheter: arbeidsflytene trenger verken `npm ci`
 * eller hemmeligheter.
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Fila med prosjektene og systemarkitektene, fra repoets rot. */
export const REGLER_STI = '.github/prosjektansvar.json'
/** Navnet på check run-en regelsettet på `main` krever. */
export const KONTROLLNAVN = 'Prosjektansvar'

/** Leser og sjekker `.github/prosjektansvar.json`. */
export function lesRegler(tekst = readFileSync(new URL(`../${REGLER_STI}`, import.meta.url), 'utf8')) {
  const { prosjekter, systemarkitekter } = JSON.parse(tekst)
  const ordbok = (verdi, hva) => {
    if (!verdi || typeof verdi !== 'object' || Array.isArray(verdi) || Object.keys(verdi).length === 0) throw new Error(`${REGLER_STI}: «${hva}» mangler eller er tom.`)
    for (const [nøkkel, navn] of Object.entries(verdi)) if (!nøkkel.trim() || typeof navn !== 'string' || !navn.trim()) throw new Error(`${REGLER_STI}: ugyldig «${hva}»: ${nøkkel}.`)
    return new Map(Object.entries(verdi))
  }
  const regler = { prosjekter: ordbok(prosjekter, 'prosjekter'), systemarkitekter: ordbok(systemarkitekter, 'systemarkitekter') }
  for (const etikett of regler.prosjekter.keys()) if (!etikett.startsWith(PREFIKS)) throw new Error(`${REGLER_STI}: prosjektetiketten ${etikett} skal begynne med ${PREFIKS}.`)
  return regler
}

/** Alt som begynner slik, regnes som et forsøk på prosjektetikett, også en feilstavet. */
const PREFIKS = 'ansvar:'
const REGLER = lesRegler()
/** De gyldige etikettene og prosjektet hver av dem gir ansvaret til. */
export const PROSJEKTETIKETTER = REGLER.prosjekter
/** GitHub-brukerne som kan være ansvarlige, med navnet de har i meldingene. */
export const SYSTEMARKITEKTER = REGLER.systemarkitekter

const PAA_NYTT = 'Kontrollen kjøres på nytt når PR-en eller Issue-et endres.'
const DOK = 'docs/prosjektansvar.md'
const oppramsing = (liste) => (liste.length < 2 ? liste.join('') : `${liste.slice(0, -1).join(', ')} eller ${liste.at(-1)}`)
const unike = (liste) => [...new Set(liste.map((e) => e.trim()))]
const person = (login, regler) => `${regler.systemarkitekter.get(login) ?? login} (${login})`

/**
 * Vurderer prosjektetikettene på en PR eller et Issue.
 * @param {string[]} etiketter Navnene på alle etikettene.
 * @returns {{ ok: true, etikett: string, prosjekt: string, melding: string } | { ok: false, melding: string }}
 */
export function vurderEtiketter(etiketter, regler = REGLER, hvem = 'PR-en') {
  const forsok = unike(etiketter).filter((e) => e.toLowerCase().startsWith(PREFIKS))
  const gyldige = oppramsing([...regler.prosjekter.keys()])
  const retting = `Sett nøyaktig én av ${gyldige}, etter hvilket prosjekt som eier oppgaven (${DOK}). ${PAA_NYTT}`
  if (forsok.length === 0) return { ok: false, melding: `${hvem} mangler prosjektetikett. ${retting}` }
  if (forsok.length > 1) {
    return { ok: false, melding: `${hvem} har ${forsok.length} prosjektetiketter (${forsok.join(', ')}), men skal ha nøyaktig én. Behold bare etiketten til prosjektet som eier oppgaven (${DOK}). ${PAA_NYTT}` }
  }
  const [etikett] = forsok
  const prosjekt = regler.prosjekter.get(etikett)
  if (!prosjekt) return { ok: false, melding: `«${etikett}» er ikke en gyldig prosjektetikett. ${retting}` }
  return { ok: true, etikett, prosjekt, melding: `${prosjekt} eier ${hvem} (${etikett}).` }
}

/**
 * Vurderer assignee-feltet: nøyaktig én, og en av systemarkitektene.
 * @param {string[]} ansvarlige GitHub-brukerne som er satt som assignee.
 */
export function vurderAnsvarlige(ansvarlige, regler = REGLER, hvem = 'PR-en') {
  const liste = unike(ansvarlige)
  const lovlige = oppramsing([...regler.systemarkitekter.keys()])
  const retting = `Sett nøyaktig én assignee: systemarkitekten som har oppgaven (${lovlige}). Et navn i teksten teller ikke (${DOK}). ${PAA_NYTT}`
  if (liste.length === 0) return { ok: false, melding: `${hvem} har ingen ansvarlig. ${retting}` }
  if (liste.length > 1) return { ok: false, melding: `${hvem} har ${liste.length} ansvarlige (${liste.join(', ')}), men skal ha nøyaktig én. Behold bare systemarkitekten som har oppgaven. ${PAA_NYTT}` }
  const [login] = liste
  if (!regler.systemarkitekter.has(login)) return { ok: false, melding: `${login} er ikke en av systemarkitektene i ${REGLER_STI}. ${retting}` }
  return { ok: true, login, melding: `${person(login, regler)} er ansvarlig.` }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Finner Issue-numrene PR-beskrivelsen viser til under «## Arbeidsoppgave»:
 * `#12`, `Refs #12`, `Closes #12`, `eier/repo#12` eller lenken til Issue-et.
 * Kommentarer i malen og henvisninger andre steder i teksten teller ikke.
 */
export function arbeidsoppgaver(tekst, repo) {
  const del = (tekst ?? '').replace(/<!--[\s\S]*?-->/g, '').split(/^##[ \t]+/m).find((d) => /^Arbeidsoppgave\b/i.test(d))
  if (!del) return []
  const [eier, navn] = repo.split('/').map(esc)
  const mønster = new RegExp(`(?:https://github\\.com/${eier}/${navn}/issues/|(?<![\\w/.-])${eier}/${navn}#|(?<![\\w/&])#)(\\d+)\\b`, 'gi')
  return [...new Set([...del.matchAll(mønster)].map((m) => Number(m[1])))]
}

/**
 * Vurderer en PR med Issue-ene den viser til.
 * @param {object} a
 * @param {{ nummer: number, opprettet: string, tekst: string, etiketter: string[], ansvarlige: string[] }} a.pr
 * @param {Map<number, { erPr: boolean, etiketter: string[], ansvarlige: string[], opprettetAv?: string, viaApp?: boolean } | null>} a.saker
 *   Issue-ene, med `null` for et nummer som ikke er et Issue i repoet.
 * @param {string | null} a.aktivertKl Da kravet om ansvarlig og arbeidsoppgave
 *   begynte å gjelde, eller `null` når det ennå ikke gjelder.
 * @param {string} a.repo `eier/navn`.
 * @param {string[]} [a.etterligning] Funn fra `finnEtterligning`; de er alltid feil.
 * @returns {{ ok: boolean, overgang: boolean, feil: string[], advarsler: string[], melding: string }}
 */
export function vurderPr({ pr, saker, aktivertKl, repo, etterligning = [], regler = REGLER }) {
  const etikett = vurderEtiketter(pr.etiketter, regler)
  const ansvar = vurderAnsvarlige(pr.ansvarlige, regler)
  const numre = arbeidsoppgaver(pr.tekst, repo)
  const eierskap = []
  if (!ansvar.ok) eierskap.push(ansvar.melding)
  if (numre.length === 0) {
    eierskap.push(`PR-en viser ikke til en arbeidsoppgave. Skriv «Refs #N» (eller «Closes #N» når PR-en fullfører oppgaven) under «## Arbeidsoppgave» i beskrivelsen, der #N er Issue-et med oppgaven. ${PAA_NYTT}`)
  }
  for (const nummer of numre) {
    const sak = saker.get(nummer)
    if (!sak) {
      eierskap.push(`#${nummer} under «Arbeidsoppgave» er ikke et Issue i ${repo}. Vis til Issue-et med oppgaven.`)
      continue
    }
    if (sak.erPr) {
      eierskap.push(`#${nummer} under «Arbeidsoppgave» er en PR, ikke et Issue. Vis til Issue-et med oppgaven.`)
      continue
    }
    const sakEtikett = vurderEtiketter(sak.etiketter, regler, `Issue #${nummer}`)
    if (!sakEtikett.ok) eierskap.push(sakEtikett.melding)
    else if (etikett.ok && sakEtikett.etikett !== etikett.etikett) {
      eierskap.push(`Issue #${nummer} har prosjektetiketten ${sakEtikett.etikett}, men PR-en ${etikett.etikett}. De skal være like: rett den som er feil (${DOK}).`)
    }
    const sakAnsvar = vurderAnsvarlige(sak.ansvarlige, regler, `Issue #${nummer}`)
    if (!sakAnsvar.ok) {
      const forslag = sak.ansvarlige.length === 0 && !sak.viaApp && regler.systemarkitekter.has(sak.opprettetAv ?? '')
        ? ` Det ble opprettet direkte i GitHub av ${person(sak.opprettetAv, regler)}.`
        : ''
      eierskap.push(`${sakAnsvar.melding}${forslag}`)
    } else if (ansvar.ok && sakAnsvar.login !== ansvar.login) {
      eierskap.push(`Issue #${nummer} er tildelt ${sakAnsvar.login}, men PR-en ${ansvar.login}. Ansvarlig skal være den samme; ved en overføring endres begge (${DOK}).`)
    }
  }

  const overgang = !aktivertKl || Date.parse(pr.opprettet) < Date.parse(aktivertKl)
  const feil = [...(etikett.ok ? [] : [etikett.melding]), ...(overgang ? [] : eierskap), ...etterligning]
  const advarsler = overgang
    ? eierskap.map((m) => `PR-en ble opprettet før kravet om ansvarlig og arbeidsoppgave gjaldt, og kan fullføres uten. ${m}`)
    : []
  const ok = feil.length === 0
  let melding
  if (!ok) melding = feil.join('\n')
  else if (eierskap.length === 0) {
    const sakliste = oppramsing(numre.map((n) => `#${n}`))
    melding = `${etikett.prosjekt} eier PR-en (${etikett.etikett}), og ${person(ansvar.login, regler)} er ansvarlig etter Issue ${sakliste}. Den kontrolleres av ChatGPT-prosjektet ${etikett.prosjekt} med «GitHub-ansvarlig: ${ansvar.login}».`
  } else {
    melding = `${etikett.prosjekt} eier PR-en (${etikett.etikett}) og kontrollerer den i ChatGPT-prosjektet ${etikett.prosjekt}.`
  }
  return { ok, overgang, feil, advarsler, melding }
}

// ------------------------------------------------------- Etterligning

/** Filene kontrollen består av. En PR som endrer dem, vurderes likevel med versjonen på `main`. */
export const KONTROLLFILER = [
  '.github/workflows/prosjektansvar.yml',
  '.github/workflows/prosjektansvar-utloser.yml',
  'scripts/prosjektansvar.mjs',
  REGLER_STI,
]

/** Hendelser som kjører en arbeidsflyt slik den er på en gren eller i en PR. */
const GRENHENDELSE = '(?:pull_request(?:_target)?|push|workflow_dispatch|merge_group)'
const GRENHENDELSER = new RegExp(`^\\s*on:\\s*\\[?[^\\n]*\\b${GRENHENDELSE}\\b|^\\s{2,}${GRENHENDELSE}\\s*:|^\\s*-\\s*${GRENHENDELSE}\\s*$`, 'm')

/**
 * Finner arbeidsflyter i en PR som kunne lage en falsk «Prosjektansvar»: en
 * arbeidsflyt som kan kjøre kode fra en gren eller PR (`pull_request`,
 * `pull_request_target`, `push`, `workflow_dispatch` eller `merge_group`) og
 * enten har en jobb med det navnet, eller kan skrive check runs eller statuser
 * (`checks: write`, `statuses: write`, `write-all` eller ingen `permissions` i
 * det hele tatt, der standardtilgangen gjelder). Den betrodde kontrollen kjøres
 * bare av `workflow_run` og `issues`, alltid fra `main`, og er ikke berørt.
 * @param {{ sti: string, innhold: string }[]} filer Endrede filer under `.github/workflows/` slik de er i PR-en.
 * @returns {string[]} Én forklaring per fil som må rettes.
 */
export function finnEtterligning(filer) {
  const funn = []
  for (const { sti, innhold } of filer) {
    const tekst = innhold.replace(/#.*$/gm, '')
    if (!GRENHENDELSER.test(tekst)) continue
    const navn = new RegExp(`^\\s*(name:\\s*['"]?${KONTROLLNAVN}['"]?|${KONTROLLNAVN}:)\\s*$`, 'mi').test(tekst)
    const skriv = /\b(checks|statuses)\s*:\s*write\b|write-all/.test(tekst)
    const utenTilgang = !/^permissions\s*:/m.test(tekst)
    if (navn) funn.push(`${sti} kan kjøre kode fra en gren eller PR og har en jobb som heter «${KONTROLLNAVN}», som kan etterligne den påkrevde kontrollen. Gi jobben et annet navn.`)
    if (skriv || utenTilgang) {
      funn.push(`${sti} kan kjøre kode fra en gren eller PR og kan skrive check runs eller statuser (${skriv ? 'checks/statuses: write' : 'ingen permissions-blokk'}), og kunne dermed etterligne kontrollen «${KONTROLLNAVN}». Gi den en permissions-blokk på toppnivå uten checks- og statuses-skrivetilgang.`)
    }
  }
  return funn
}

// ---------------------------------------------------------------- GitHub

/** En liten klient for GitHubs REST-API. `null` når noe ikke finnes (404/410). */
export function lagGithub({ token, fetch = globalThis.fetch, api = 'https://api.github.com' }) {
  return async function github(sti, { metode = 'GET', finnes = false, data } = {}) {
    const svar = await fetch(`${api}/${sti}`, {
      method: metode,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        'user-agent': 'ousfar-prosjektansvar',
        ...(data ? { 'content-type': 'application/json' } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    })
    if (finnes && (svar.status === 404 || svar.status === 410)) return null
    if (!svar.ok) throw new Error(`GitHub svarte ${svar.status} på ${metode} ${sti}: ${(await svar.text()).slice(0, 300)}`)
    const tekst = await svar.text()
    return tekst ? JSON.parse(tekst) : null
  }
}

/** Alle elementene i en liste fra GitHub, side for side. */
export async function alle(github, sti) {
  const resultat = []
  for (let side = 1; ; side++) {
    const liste = await github(`${sti}${sti.includes('?') ? '&' : '?'}per_page=100&page=${side}`)
    resultat.push(...liste)
    if (liste.length < 100) return resultat
  }
}

/** PR-en slik kontrollen trenger den. */
export const somPr = (pr) => ({
  nummer: pr.number,
  opprettet: pr.created_at,
  tekst: pr.body ?? '',
  etiketter: pr.labels.map((l) => l.name),
  ansvarlige: pr.assignees.map((a) => a.login),
})

/** Issue-et slik kontrollen trenger det, eller `null` når det ikke (lenger) er i repoet. */
export function somSak(sak, repo) {
  if (!sak || !sak.repository_url?.toLowerCase().endsWith(`/repos/${repo.toLowerCase()}`)) return null
  return {
    erPr: Boolean(sak.pull_request),
    etiketter: sak.labels.map((l) => (typeof l === 'string' ? l : l.name)),
    ansvarlige: sak.assignees.map((a) => a.login),
    opprettetAv: sak.user?.login,
    viaApp: Boolean(sak.performed_via_github_app),
  }
}

/**
 * Da kravet om ansvarlig og arbeidsoppgave begynte å gjelde: da `REGLER_STI`
 * kom på standardgrenen (den eldste commiten der som endrer fila), eller
 * `null` hvis den ikke er der ennå.
 */
export async function hentAktivering(github, repo, gren) {
  const commits = await alle(github, `repos/${repo}/commits?sha=${encodeURIComponent(gren)}&path=${encodeURIComponent(REGLER_STI)}`)
  return commits.at(-1)?.commit.committer.date ?? null
}

/** Arbeidsflytene blant de endrede filene, slik de er på PR-ens siste commit (som data, aldri kjørt). */
async function arbeidsflyter(github, repo, filer, sha) {
  const ut = []
  for (const f of filer.filter((f) => f.status !== 'removed' && /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f.filename))) {
    const innhold = await github(`repos/${repo}/contents/${f.filename.split('/').map(encodeURIComponent).join('/')}?ref=${sha}`)
    ut.push({ sti: f.filename, innhold: Buffer.from(innhold.content, 'base64').toString('utf8') })
  }
  return ut
}

/** Vurderer en PR (rådata fra GitHub) med ny tilstand fra GitHub. */
export async function kontrollerPr(github, repo, rå, gren) {
  const pr = somPr(rå)
  const saker = new Map()
  for (const n of arbeidsoppgaver(pr.tekst, repo)) saker.set(n, somSak(await github(`repos/${repo}/issues/${n}`, { finnes: true }), repo))
  const filer = await alle(github, `repos/${repo}/pulls/${pr.nummer}/files`)
  const etterligning = finnEtterligning(await arbeidsflyter(github, repo, filer, rå.head.sha))
  const vurdering = vurderPr({ pr, saker, aktivertKl: await hentAktivering(github, repo, gren), repo, etterligning })
  const endrerKontrollen = filer.map((f) => f.filename).filter((f) => KONTROLLFILER.includes(f))
  if (endrerKontrollen.length) {
    vurdering.advarsler.push(`PR-en endrer kontrollen selv (${endrerKontrollen.join(', ')}). Den er vurdert med versjonen på main; endringen virker først når den er slått sammen, så den skal kontrolleres særskilt.`)
  }
  return vurdering
}

/** De åpne PR-ene som viser til Issue-et under «Arbeidsoppgave». */
export async function prerForSak(github, repo, sak) {
  return (await alle(github, `repos/${repo}/pulls?state=open`)).filter((pr) => arbeidsoppgaver(pr.body, repo).includes(sak))
}

/** De åpne PR-ene som har commiten øverst. */
export async function prerForSha(github, repo, sha) {
  return (await alle(github, `repos/${repo}/pulls?state=open`)).filter((pr) => pr.head.sha === sha)
}

const tittelFor = (v) => (v.ok ? (v.advarsler.length ? 'Godkjent, med advarsler' : 'Godkjent') : `${v.feil.length} feil må rettes`)

/**
 * Skriver commit-statusen «Prosjektansvar», som regelsettet krever, på
 * PR-ens siste commit. Beskrivelsen er kort (GitHub tillater 140 tegn);
 * forklaringen står i check run-en lenken går til.
 */
async function meldStatus(github, repo, sha, state, beskrivelse, lenke) {
  await github(`repos/${repo}/statuses/${sha}`, {
    metode: 'POST',
    data: { context: KONTROLLNAVN, state, description: beskrivelse.slice(0, 140), ...(lenke ? { target_url: lenke } : {}) },
  })
}

/**
 * Vurderer PR-en og skriver resultatet på PR-ens siste commit: som
 * commit-statusen «Prosjektansvar» (den regelsettet krever) og som en check
 * run med samme navn og hele forklaringen. Begge startes som «pågår» før
 * vurderingen, så en gammel grønn ikke gjelder mens den nye lages; feiler
 * vurderingen, blir begge røde.
 */
export async function vurderOgMeld(github, repo, rå, gren, lenke) {
  const sha = rå.head.sha
  const kontroll = await github(`repos/${repo}/check-runs`, {
    metode: 'POST',
    data: { name: KONTROLLNAVN, head_sha: sha, status: 'in_progress', ...(lenke ? { details_url: lenke } : {}) },
  })
  const detaljer = kontroll.html_url || lenke
  await meldStatus(github, repo, sha, 'pending', 'Vurderes', detaljer)
  let v
  try {
    v = await kontrollerPr(github, repo, rå, gren)
  } catch (e) {
    v = { ok: false, overgang: false, feil: [`Kontrollen kunne ikke fullføres: ${e.message}. Den kjøres på nytt ved neste endring av PR-en eller Issue-et.`], advarsler: [], melding: '' }
  }
  const linjer = [...(v.ok ? [v.melding] : v.feil), ...v.advarsler]
  await github(`repos/${repo}/check-runs/${kontroll.id}`, {
    metode: 'PATCH',
    data: {
      status: 'completed',
      conclusion: v.ok ? 'success' : 'failure',
      output: { title: tittelFor(v), summary: linjer.map((l) => `- ${l}`).join('\n').slice(0, 65000) },
    },
  })
  await meldStatus(github, repo, sha, v.ok ? 'success' : 'failure', v.ok ? tittelFor(v) : `${tittelFor(v)}: se detaljer`, detaljer)
  return { nummer: rå.number, ...v }
}

// ---------------------------------------------------------------- Kjøring

function oppsummer(tittel, linjer) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${tittel}\n\n${linjer.map((l) => `- ${l}`).join('\n')}\n`)
}

async function kjor() {
  const hendelse = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  const repo = process.env.GITHUB_REPOSITORY
  const gren = hendelse.repository.default_branch
  const github = lagGithub({ token: process.env.GH_TOKEN })
  const navn = process.env.GITHUB_EVENT_NAME

  let prer
  if (navn === 'workflow_run') prer = await prerForSha(github, repo, hendelse.workflow_run.head_sha)
  else if (navn === 'issues') prer = await prerForSak(github, repo, hendelse.issue.number)
  else throw new Error(`Ukjent hendelse ${navn}.`)

  const lenke = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}` : undefined
  const logg = []
  for (const pr of prer) {
    const v = await vurderOgMeld(github, repo, pr, gren, lenke)
    logg.push(`#${v.nummer}: ${v.ok ? 'grønn' : 'rød'}. ${v.ok ? v.melding : v.feil.join(' ')}${v.advarsler.length ? ` Advarsler: ${v.advarsler.join(' ')}` : ''}`)
  }
  if (prer.length === 0) logg.push(navn === 'issues' ? `Ingen åpne PR-er viser til #${hendelse.issue.number}.` : 'Ingen åpne PR-er har denne commiten øverst.')
  for (const l of logg) console.log(l)
  oppsummer('Prosjektansvar', logg)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  kjor().catch((e) => {
    for (const linje of e.message.split('\n')) console.log(`::error title=Kontrollen «Prosjektansvar» feilet::${linje}`)
    process.exitCode = 1
  })
}
